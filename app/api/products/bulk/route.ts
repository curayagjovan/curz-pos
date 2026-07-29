import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateSmartSku } from "@/lib/sku-generator";
import { setImportProgress } from "@/lib/import-progress-store";
import { normalizeUnit } from "@/lib/units";
import { requireOwner } from "@/lib/auth/require-user";
import {
  DEFAULT_PRODUCT_CATEGORY,
  isValidProductCategory,
} from "@/lib/product-categories";

// Use direct DB connection for bulk imports to reduce pooled-connection issues.
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    },
  },
  log: ["error"],
});

type BulkProductData = {
  sku?: string;
  name?: string;
  unit?: string;
  category?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
};

type BulkResult = {
  row: number;
  productName: string;
  sku: string;
  success: boolean;
  message: string;
};

type BulkMarkupPayload = {
  products: BulkProductData[];
  fileHash?: string;
  jobId?: string;
};

type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  unit: string | null;
  description: string | null;
  cost: Prisma.Decimal;
  markupPct: Prisma.Decimal;
  price: Prisma.Decimal;
  stock: number;
};

function toNameUnitKey(name: string, unit?: string | null): string {
  return `${name.trim().toLowerCase()}::${(unit ?? "").trim().toLowerCase()}`;
}

function findAvailableSkuFromSet(
  baseSku: string,
  usedSkus: Set<string>,
): string {
  let sequence = 2;

  while (sequence <= 9999) {
    const candidate = `${baseSku}-${String(sequence).padStart(2, "0")}`;
    if (!usedSkus.has(candidate)) {
      return candidate;
    }
    sequence += 1;
  }

  throw new Error("Unable to generate a unique SKU");
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return auth.response;
  }

  let importJobId: string | undefined;

  try {
    const requestStartedAt = Date.now();

    let body: BulkMarkupPayload;
    try {
      body = (await request.json()) as BulkMarkupPayload;
    } catch (parseError) {
      const parseMessage =
        parseError instanceof SyntaxError
          ? `Invalid JSON: ${parseError.message}`
          : "Failed to parse request body";
      console.error(`[Bulk Import] Parse error: ${parseMessage}`);
      return NextResponse.json({ message: parseMessage }, { status: 400 });
    }

    const { products, fileHash, jobId } = body;
    importJobId = jobId;

    // Detect re-import: allow processing but skip stock additions
    let isDuplicateFile = false;
    if (fileHash) {
      const recentImport = await prisma.importLog.findUnique({
        where: { fileHash },
      });

      if (recentImport) {
        isDuplicateFile = true;
        console.info(
          `[Bulk Import] Duplicate file detected (hash ${fileHash}). Stock additions will be skipped.`,
        );
      }
    }

    if (!Array.isArray(products) || products.length === 0) {
      if (jobId) {
        setImportProgress(jobId, {
          status: "failed",
          phase: "failed",
          message: "No products provided",
        });
      }

      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 },
      );
    }

    const setupFinishedAt = Date.now();
    const preloadStartedAt = Date.now();

    const results: BulkResult[] = [];
    const totalRows = products.length;
    let processedRows = 0;
    let successSoFar = 0;
    let failureSoFar = 0;

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "setup",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Preparing import",
      });
    }

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "preload",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Preloading existing products",
      });
    }

    const rawSkusToLookup = new Set<string>();
    const nameUnitKeysToLookup = new Set<string>();
    const namesToLookup = new Set<string>();

    for (const item of products) {
      const rawSku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
      const unit = item.unit?.toString().trim();

      if (rawSku) {
        rawSkusToLookup.add(rawSku);
      }

      if (name) {
        namesToLookup.add(name);
        if (!rawSku) {
          nameUnitKeysToLookup.add(toNameUnitKey(name, unit));

          try {
            rawSkusToLookup.add(generateSmartSku(name, item.price));
          } catch {
            // Validation for SKU generation is handled per-row below.
          }
        }
      }
    }

    const [existingBySkuList, existingByNameCandidates] = await Promise.all([
      rawSkusToLookup.size > 0
        ? prisma.product.findMany({
            where: {
              sku: { in: Array.from(rawSkusToLookup) },
            },
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              description: true,
              cost: true,
              markupPct: true,
              price: true,
              stock: true,
            },
          })
        : Promise.resolve([] as ProductSnapshot[]),
      namesToLookup.size > 0
        ? prisma.product.findMany({
            where: {
              OR: Array.from(namesToLookup).map((name) => ({
                name: { equals: name, mode: "insensitive" },
              })),
            },
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              description: true,
              cost: true,
              markupPct: true,
              price: true,
              stock: true,
            },
          })
        : Promise.resolve([] as ProductSnapshot[]),
    ]);

    const existingProductBySku = new Map<string, ProductSnapshot>();
    const existingProductByNameUnit = new Map<string, ProductSnapshot>();
    const reservedSkus = new Set<string>();

    for (const product of [...existingBySkuList, ...existingByNameCandidates]) {
      existingProductBySku.set(product.sku, product);
      reservedSkus.add(product.sku);

      const nameUnitKey = toNameUnitKey(product.name, product.unit);
      if (nameUnitKeysToLookup.has(nameUnitKey)) {
        existingProductByNameUnit.set(nameUnitKey, product);
      }
    }

    // Preload all suffix variants (e.g. SKU-02, SKU-03) to avoid per-row DB calls for collision detection
    if (rawSkusToLookup.size > 0) {
      const suffixVariants = await prisma.product.findMany({
        where: {
          OR: Array.from(rawSkusToLookup).map((sku) => ({
            sku: { startsWith: `${sku}-` },
          })),
        },
        select: { sku: true },
      });
      for (const row of suffixVariants) {
        reservedSkus.add(row.sku);
      }
    }

    const preloadFinishedAt = Date.now();
    const processingStartedAt = Date.now();

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "processing",
        totalRows,
        processedRows: 0,
        successCount: 0,
        failureCount: 0,
        message: "Planning import operations",
      });
    }

    console.info(`[Bulk Import] Planning ${totalRows} row(s).`);

    // --- Planning phase: resolve all SKUs and build DB ops in-memory (no DB calls) ---
    type DbOpFn = () => Promise<unknown>;
    const plannedDbOps: Array<{ resultIndex: number; fn: DbOpFn }> = [];

    for (const [index, item] of products.entries()) {
      const row = index + 1;
      const rawSku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
      const productName = name || "(missing name)";
      const rawUnit = item.unit?.toString().trim();
      const normalizedUnitInfo = normalizeUnit(rawUnit);
      const unit = normalizedUnitInfo.unit;

      const description = item.description?.toString().trim();
      const category = isValidProductCategory(item.category)
        ? item.category
        : DEFAULT_PRODUCT_CATEGORY;
      const price = Number(item.price);
      const stock = Number(item.stock ?? 0);

      if (!name) {
        results.push({
          row,
          productName,
          sku: rawSku || "(missing)",
          success: false,
          message: "Missing product name",
        });
        continue;
      }
      if (Number.isNaN(price)) {
        results.push({
          row,
          productName,
          sku: rawSku || name,
          success: false,
          message: `Invalid price: '${item.price}' is not a number`,
        });
        continue;
      }
      if (price < 0) {
        results.push({
          row,
          productName,
          sku: rawSku || name,
          success: false,
          message: `Invalid price: ${price} cannot be negative`,
        });
        continue;
      }
      if (Number.isNaN(stock)) {
        results.push({
          row,
          productName,
          sku: rawSku || name,
          success: false,
          message: `Invalid stock: '${item.stock}' is not a number`,
        });
        continue;
      }
      if (stock < 0) {
        results.push({
          row,
          productName,
          sku: rawSku || name,
          success: false,
          message: `Invalid stock: ${stock} cannot be negative`,
        });
        continue;
      }

      const appliedMarkup = 0;
      const usesGlobalMarkup = false;
      const importedCost = price;
      const importedStock = Math.round(stock);
      const sellingPrice = importedCost;
      const skuForError = rawSku || "(generated)";

      try {
        const existingByNameAndUnit = rawSku
          ? null
          : existingProductByNameUnit.get(toNameUnitKey(name, unit));

        if (existingByNameAndUnit) {
          const nextMarkup = appliedMarkup;
          const nextPrice = sellingPrice;
          const priceChanged =
            Number(existingByNameAndUnit.price) !== nextPrice;
          const newStock = isDuplicateFile
            ? existingByNameAndUnit.stock
            : existingByNameAndUnit.stock + importedStock;

          const updatedSnapshot: ProductSnapshot = {
            ...existingByNameAndUnit,
            name,
            unit: unit || null,
            description: description || existingByNameAndUnit.description,
            cost: new Prisma.Decimal(importedCost),
            markupPct: new Prisma.Decimal(nextMarkup),
            price: new Prisma.Decimal(nextPrice),
            stock: newStock,
          };
          existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
          existingProductByNameUnit.set(
            toNameUnitKey(name, unit),
            updatedSnapshot,
          );

          const resultIndex = results.length;
          results.push({
            row,
            productName,
            sku: existingByNameAndUnit.sku,
            success: true,
            message: isDuplicateFile
              ? `Updated (stock unchanged)${priceChanged ? ", price changed" : ""}`
              : priceChanged
                ? `Updated: stock +${importedStock}, price changed`
                : `Updated: stock +${importedStock}`,
          });

          const productId = existingByNameAndUnit.id;
          const prevStock = existingByNameAndUnit.stock;
          const existingDescription = existingByNameAndUnit.description;
          plannedDbOps.push({
            resultIndex,
            fn: () =>
              prisma.product.update({
                where: { id: productId },
                data: {
                  name,
                  unit: unit || undefined,
                  description: description || existingDescription,
                  cost: importedCost,
                  markupPct: nextMarkup,
                  stock: newStock,
                  price: nextPrice,
                  usesGlobalMarkup,
                  isActive: true,
                  ...(!isDuplicateFile && {
                    inventoryMovements: {
                      create: {
                        movementType: "BULK_IMPORT",
                        quantityDelta: importedStock,
                        previousStock: prevStock,
                        newStock,
                        referenceType: "BULK_IMPORT",
                        note: `Bulk import update for ${existingByNameAndUnit.sku}`,
                      },
                    },
                  }),
                },
              }),
          });
          continue;
        }

        const targetSku = (() => {
          if (rawSku) return rawSku;
          try {
            return generateSmartSku(name, price);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Unknown SKU error";
            throw new Error(`SKU generation failed: ${reason}`);
          }
        })();

        const existingBySku = existingProductBySku.get(targetSku);

        if (existingBySku) {
          const sameProductName =
            existingBySku.name.trim().toLowerCase() ===
            name.trim().toLowerCase();

          if (!sameProductName) {
            const uniqueSku = findAvailableSkuFromSet(targetSku, reservedSkus);
            reservedSkus.add(uniqueSku);
            const pendingProductId = crypto.randomUUID();

            const createdSnapshot: ProductSnapshot = {
              id: pendingProductId,
              sku: uniqueSku,
              name,
              unit: unit || null,
              description: description || null,
              cost: new Prisma.Decimal(importedCost),
              markupPct: new Prisma.Decimal(appliedMarkup),
              price: new Prisma.Decimal(sellingPrice),
              stock: importedStock,
            };
            existingProductBySku.set(uniqueSku, createdSnapshot);
            existingProductByNameUnit.set(
              toNameUnitKey(name, unit),
              createdSnapshot,
            );

            const resultIndex = results.length;
            results.push({
              row,
              productName,
              sku: uniqueSku,
              success: true,
              message: `Created with adjusted SKU (collision on ${targetSku})`,
            });

            plannedDbOps.push({
              resultIndex,
              fn: () =>
                prisma.product.create({
                  data: {
                    id: pendingProductId,
                    sku: uniqueSku,
                    name,
                    unit: unit || null,
                    category,
                    description: description || null,
                    cost: importedCost,
                    markupPct: appliedMarkup,
                    price: sellingPrice,
                    stock: importedStock,
                    usesGlobalMarkup,
                    isActive: true,
                    inventoryMovements: {
                      create: {
                        movementType: "BULK_IMPORT",
                        quantityDelta: importedStock,
                        previousStock: 0,
                        newStock: importedStock,
                        referenceType: "BULK_IMPORT",
                        note: `Bulk import create for ${uniqueSku} (SKU adjusted from ${targetSku})`,
                      },
                    },
                  },
                  select: { id: true },
                }),
            });
            continue;
          }

          if (isDuplicateFile) {
            const nextMarkupBySku = appliedMarkup;
            const nextPriceBySku = sellingPrice;
            const priceChangedBySku =
              Number(existingBySku.price) !== nextPriceBySku;

            const updatedSnapshot: ProductSnapshot = {
              ...existingBySku,
              name,
              unit: unit || null,
              description: description || existingBySku.description,
              cost: new Prisma.Decimal(importedCost),
              markupPct: new Prisma.Decimal(nextMarkupBySku),
              price: new Prisma.Decimal(nextPriceBySku),
              stock: existingBySku.stock,
            };
            existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
            existingProductByNameUnit.set(
              toNameUnitKey(name, unit),
              updatedSnapshot,
            );

            const resultIndex = results.length;
            results.push({
              row,
              productName,
              sku: existingBySku.sku,
              success: true,
              message: `Updated (stock unchanged)${priceChangedBySku ? ", price changed" : ""}`,
            });

            const productId = existingBySku.id;
            const existingDescriptionBySku = existingBySku.description;
            plannedDbOps.push({
              resultIndex,
              fn: () =>
                prisma.product.update({
                  where: { id: productId },
                  data: {
                    name,
                    unit: unit || undefined,
                    description: description || existingDescriptionBySku,
                    cost: importedCost,
                    markupPct: nextMarkupBySku,
                    price: nextPriceBySku,
                    usesGlobalMarkup,
                    isActive: true,
                  },
                }),
            });
            continue;
          }

          const nextMarkupBySku = appliedMarkup;
          const nextPriceBySku = sellingPrice;
          const priceChangedBySku =
            Number(existingBySku.price) !== nextPriceBySku;
          const newStockBySku = existingBySku.stock + importedStock;

          const updatedSnapshot: ProductSnapshot = {
            ...existingBySku,
            name,
            unit: unit || null,
            description: description || existingBySku.description,
            cost: new Prisma.Decimal(importedCost),
            markupPct: new Prisma.Decimal(nextMarkupBySku),
            price: new Prisma.Decimal(nextPriceBySku),
            stock: newStockBySku,
          };
          existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
          existingProductByNameUnit.set(
            toNameUnitKey(name, unit),
            updatedSnapshot,
          );

          const resultIndex = results.length;
          results.push({
            row,
            productName,
            sku: targetSku,
            success: true,
            message: priceChangedBySku
              ? `Updated: stock +${importedStock}, price changed`
              : `Updated: stock +${importedStock}`,
          });

          const productId = existingBySku.id;
          const prevStockBySku = existingBySku.stock;
          const existingDescriptionBySku = existingBySku.description;
          plannedDbOps.push({
            resultIndex,
            fn: () =>
              prisma.product.update({
                where: { id: productId },
                data: {
                  name,
                  unit: unit || undefined,
                  description: description || existingDescriptionBySku,
                  cost: importedCost,
                  markupPct: nextMarkupBySku,
                  stock: newStockBySku,
                  price: nextPriceBySku,
                  usesGlobalMarkup,
                  isActive: true,
                  inventoryMovements: {
                    create: {
                      movementType: "BULK_IMPORT",
                      quantityDelta: importedStock,
                      previousStock: prevStockBySku,
                      newStock: newStockBySku,
                      referenceType: "BULK_IMPORT",
                      note: `Bulk import update for ${targetSku}`,
                    },
                  },
                },
              }),
          });
          continue;
        }

        // New product
        reservedSkus.add(targetSku);
        const pendingProductId = crypto.randomUUID();
        const createdSnapshot: ProductSnapshot = {
          id: pendingProductId,
          sku: targetSku,
          name,
          unit: unit || null,
          description: description || null,
          cost: new Prisma.Decimal(importedCost),
          markupPct: new Prisma.Decimal(appliedMarkup),
          price: new Prisma.Decimal(sellingPrice),
          stock: importedStock,
        };
        existingProductBySku.set(targetSku, createdSnapshot);
        existingProductByNameUnit.set(
          toNameUnitKey(name, unit),
          createdSnapshot,
        );

        const resultIndex = results.length;
        results.push({
          row,
          productName,
          sku: targetSku,
          success: true,
          message: "Created",
        });

        plannedDbOps.push({
          resultIndex,
          fn: () =>
            prisma.product.create({
              data: {
                id: pendingProductId,
                sku: targetSku,
                name,
                unit: unit || null,
                category,
                description: description || null,
                cost: importedCost,
                markupPct: appliedMarkup,
                price: sellingPrice,
                stock: importedStock,
                usesGlobalMarkup,
                isActive: true,
                inventoryMovements: {
                  create: {
                    movementType: "BULK_IMPORT",
                    quantityDelta: importedStock,
                    previousStock: 0,
                    newStock: importedStock,
                    referenceType: "BULK_IMPORT",
                    note: `Bulk import create for ${targetSku}`,
                  },
                },
              },
              select: { id: true },
            }),
        });
      } catch (error) {
        const detailedMessage = (() => {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002")
              return "Duplicate value violates a unique field";
            if (error.code === "P2003")
              return "Related record not found (foreign key constraint)";
            if (error.code === "P2020")
              return "Invalid value for a database field";
          }
          if (error instanceof Error && error.message.trim().length > 0)
            return error.message;
          return "Database error";
        })();
        results.push({
          row,
          productName,
          sku: skuForError,
          success: false,
          message: detailedMessage,
        });
      }
    }

    console.info(
      `[Bulk Import] Planning done. Executing ${plannedDbOps.length} DB ops in parallel.`,
    );

    // --- Execution phase: run DB ops in-order so later updates can safely target products
    // created earlier in the same import request.
    const CHUNK_SIZE = 1;
    for (let i = 0; i < plannedDbOps.length; i += CHUNK_SIZE) {
      const chunk = plannedDbOps.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async ({ resultIndex, fn }) => {
          try {
            await fn();
          } catch (error) {
            results[resultIndex].success = false;
            results[resultIndex].message = (() => {
              if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002")
                  return "Duplicate value violates a unique field";
                if (error.code === "P2003")
                  return "Related record not found (foreign key constraint)";
                if (error.code === "P2020")
                  return "Invalid value for a database field";
              }
              if (error instanceof Error && error.message.trim().length > 0)
                return error.message;
              return "Database error";
            })();
          }
        }),
      );

      processedRows += chunk.length;
      successSoFar = results
        .slice(0, processedRows)
        .filter((r) => r.success).length;
      failureSoFar = processedRows - successSoFar;

      if (jobId) {
        setImportProgress(jobId, {
          status: "running",
          phase: "processing",
          totalRows,
          processedRows,
          successCount: successSoFar,
          failureCount: failureSoFar,
          message: `Processed ${processedRows}/${totalRows}`,
        });
      }

      console.info(
        `[Bulk Import] Processed ${processedRows}/${totalRows} | Success: ${successSoFar} | Failed: ${failureSoFar}`,
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const processingFinishedAt = Date.now();

    console.info(
      `[Bulk Import] Finished ${totalRows} row(s) | Success: ${successCount} | Failed: ${failureCount}`,
    );

    const loggingStartedAt = Date.now();

    if (jobId) {
      setImportProgress(jobId, {
        status: "running",
        phase: "logging",
        totalRows,
        processedRows: totalRows,
        successCount,
        failureCount,
        message: "Finalizing import logs",
      });
    }

    // Log this import for duplicate detection
    if (fileHash) {
      await prisma.importLog.upsert({
        where: { fileHash },
        update: {
          rowCount: totalRows,
          productCount: products.length,
          successCount,
          failureCount,
        },
        create: {
          fileHash,
          rowCount: totalRows,
          productCount: products.length,
          successCount,
          failureCount,
        },
      });
    }

    const loggingFinishedAt = Date.now();
    const timing = {
      setupMs: setupFinishedAt - requestStartedAt,
      preloadMs: preloadFinishedAt - preloadStartedAt,
      processingMs: processingFinishedAt - processingStartedAt,
      loggingMs: loggingFinishedAt - loggingStartedAt,
      totalMs: loggingFinishedAt - requestStartedAt,
    };

    console.info(
      `[Bulk Import Timing] total=${timing.totalMs}ms setup=${timing.setupMs}ms preload=${timing.preloadMs}ms processing=${timing.processingMs}ms logging=${timing.loggingMs}ms`,
    );

    if (jobId) {
      setImportProgress(jobId, {
        status: "completed",
        phase: "completed",
        totalRows,
        processedRows: totalRows,
        successCount,
        failureCount,
        message: "Import complete",
        durationMs: timing.totalMs,
        timing,
      });
    }

    const response = NextResponse.json(
      {
        message: `Imported ${successCount} product(s), ${failureCount} failed`,
        summary: { successCount, failureCount, total: results.length },
        results,
        durationMs: timing.totalMs,
        timing,
        isDuplicate: fileHash && results.length === 0 ? false : undefined,
      },
      { status: 200 },
    );

    response.headers.set(
      "Server-Timing",
      `setup;dur=${timing.setupMs}, preload;dur=${timing.preloadMs}, processing;dur=${timing.processingMs}, logging;dur=${timing.loggingMs}, total;dur=${timing.totalMs}`,
    );

    return response;
  } catch (error) {
    const errorName =
      error instanceof Error ? error.constructor.name : typeof error;
    const errorMessage =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unknown error";

    console.error(`[Bulk Import] Error (${errorName}):`, errorMessage);
    if (error instanceof Error) {
      console.error("[Bulk Import] Stack:", error.stack);
    }

    try {
      const userFacingMessage = (() => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            return "Duplicate SKU or product already exists. Please check your data.";
          }
          if (error.code === "P2003") {
            return "Product reference error. Some related products may not exist.";
          }
          if (error.code === "P2020") {
            return "Invalid data format for a database field. Check price and stock values are numbers.";
          }
          return `Database error (${error.code}): ${error.message}`;
        }

        if (error instanceof SyntaxError) {
          return "Invalid request format. Please ensure the CSV is properly formatted.";
        }

        return errorMessage || "Unable to process bulk import";
      })();

      if (importJobId) {
        setImportProgress(importJobId, {
          status: "failed",
          phase: "failed",
          message: userFacingMessage,
        });
      }
    } catch {
      // Ignore progress update errors when handling top-level failures.
    }

    return NextResponse.json(
      { message: "Unable to process bulk import" },
      { status: 500 },
    );
  }
}

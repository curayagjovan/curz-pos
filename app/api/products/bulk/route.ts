import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSmartSku } from "@/lib/sku-generator";
import { calculateSellingPrice } from "@/lib/price-calculator";
import { setImportProgress } from "@/lib/import-progress-store";

type BulkProductData = {
  sku?: string;
  name?: string;
  unit?: string;
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
  markupPercent?: number;
  filterType?: "all" | "unit" | "category" | "productType";
  filterValue?: string;
  fileHash?: string;
  jobId?: string;
};

type AppSettingSnapshot = {
  globalMarkupPercent: number | string;
  globalMarkupFilterType: "all" | "unit" | "category" | "productType";
  globalMarkupFilterValue: string | null;
};

type PrismaWithAppSettingDelegate = typeof prisma & {
  appSetting: {
    findUnique: (args: {
      where: { id: number };
    }) => Promise<AppSettingSnapshot | null>;
  };
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
  let importJobId: string | undefined;

  try {
    const requestStartedAt = Date.now();
    const body = (await request.json()) as BulkMarkupPayload;
    const { products, fileHash, jobId } = body;
    importJobId = jobId;
    const prismaWithAppSetting = prisma as PrismaWithAppSettingDelegate;
    const appSettings = await prismaWithAppSetting.appSetting.findUnique({
      where: { id: 1 },
    });
    const fallbackMarkup = Number(body.markupPercent ?? 0);
    const markupPercent = Number(
      appSettings?.globalMarkupPercent ?? fallbackMarkup,
    );
    const filterType =
      appSettings?.globalMarkupFilterType ?? body.filterType ?? "all";
    const filterValue =
      appSettings?.globalMarkupFilterValue?.trim() ??
      body.filterValue?.trim() ??
      "";

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

    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      if (jobId) {
        setImportProgress(jobId, {
          status: "failed",
          phase: "failed",
          message: "Invalid markupPercent. It must be 0 or higher.",
        });
      }

      return NextResponse.json(
        { message: "Invalid markupPercent. It must be 0 or higher." },
        { status: 400 },
      );
    }

    if (markupPercent > 0 && filterType !== "all" && filterValue.length === 0) {
      if (jobId) {
        setImportProgress(jobId, {
          status: "failed",
          phase: "failed",
          message: "Filter value is required for this markup filter.",
        });
      }

      return NextResponse.json(
        { message: "Filter value is required for this markup filter." },
        { status: 400 },
      );
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
            rawSkusToLookup.add(generateSmartSku(name, unit));
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
        message: "Import in progress",
      });
    }

    console.info(`[Bulk Import] Started processing ${totalRows} row(s).`);

    for (const [index, item] of products.entries()) {
      const row = index + 1;
      const rawSku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
      const productName = name || "(missing name)";
      const unit = item.unit?.toString().trim();
      const description = item.description?.toString().trim();
      const price = Number(item.price);
      const stock = Number(item.stock ?? 0);

      // Detailed validation
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

      const matchesMarkupFilter = (() => {
        if (markupPercent <= 0) {
          return false;
        }

        if (filterType === "all") {
          return true;
        }

        if (filterType === "unit") {
          return (unit ?? "").toLowerCase() === filterValue.toLowerCase();
        }

        const keyword = filterValue.toLowerCase();
        const haystack = `${name} ${description ?? ""}`.toLowerCase();
        return haystack.includes(keyword);
      })();

      const appliedMarkup = matchesMarkupFilter ? markupPercent : 0;
      const usesGlobalMarkup = matchesMarkupFilter;
      const sellingPrice = calculateSellingPrice(price, appliedMarkup);
      let skuForError = rawSku || "(generated)";

      try {
        const existingByNameAndUnit = rawSku
          ? null
          : existingProductByNameUnit.get(toNameUnitKey(name, unit));

        if (existingByNameAndUnit) {
          const existingCost = Number(existingByNameAndUnit.cost);
          const hasSameCost = existingCost.toFixed(2) === price.toFixed(2);
          const nextMarkup = hasSameCost
            ? Number(existingByNameAndUnit.markupPct)
            : appliedMarkup;
          const nextPrice = hasSameCost
            ? Number(existingByNameAndUnit.price)
            : sellingPrice;
          const priceChanged =
            Number(existingByNameAndUnit.price) !== nextPrice;
          const newStock = isDuplicateFile
            ? existingByNameAndUnit.stock
            : existingByNameAndUnit.stock + stock;

          await prisma.product.update({
            where: { id: existingByNameAndUnit.id },
            data: {
              name,
              unit: unit || undefined,
              description: description || existingByNameAndUnit.description,
              cost: hasSameCost ? undefined : price,
              markupPct: nextMarkup,
              stock: newStock,
              price: nextPrice,
              usesGlobalMarkup,
              isActive: true,
              ...(!isDuplicateFile && {
                inventoryMovements: {
                  create: {
                    movementType: "BULK_IMPORT",
                    quantityDelta: stock,
                    previousStock: existingByNameAndUnit.stock,
                    newStock,
                    referenceType: "BULK_IMPORT",
                    note: `Bulk import update for ${existingByNameAndUnit.sku}`,
                  },
                },
              }),
            },
          });

          const updatedSnapshot: ProductSnapshot = {
            ...existingByNameAndUnit,
            name,
            unit: unit || null,
            description: description || existingByNameAndUnit.description,
            cost: new Prisma.Decimal(hasSameCost ? existingCost : price),
            markupPct: new Prisma.Decimal(nextMarkup),
            price: new Prisma.Decimal(nextPrice),
            stock: newStock,
          };
          existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
          existingProductByNameUnit.set(
            toNameUnitKey(name, unit),
            updatedSnapshot,
          );

          results.push({
            row,
            productName,
            sku: existingByNameAndUnit.sku,
            success: true,
            message: isDuplicateFile
              ? `Updated (stock unchanged)${priceChanged ? ", price changed" : ""}`
              : priceChanged
                ? `Updated: stock +${stock}, price changed`
                : `Updated: stock +${stock}`,
          });
          continue;
        }

        const targetSku = (() => {
          if (rawSku) {
            return rawSku;
          }

          try {
            return generateSmartSku(name, unit);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Unknown SKU error";
            throw new Error(`SKU generation failed: ${reason}`);
          }
        })();
        skuForError = targetSku;

        const existingBySku = existingProductBySku.get(targetSku);

        if (existingBySku) {
          const sameProductName =
            existingBySku.name.trim().toLowerCase() ===
            name.trim().toLowerCase();

          if (!sameProductName) {
            if (reservedSkus.has(targetSku)) {
              const relatedSkus = await prisma.product.findMany({
                where: {
                  sku: { startsWith: `${targetSku}-` },
                },
                select: { sku: true },
              });

              for (const relatedSku of relatedSkus) {
                reservedSkus.add(relatedSku.sku);
              }
            }

            const uniqueSku = findAvailableSkuFromSet(targetSku, reservedSkus);

            const createdProduct = await prisma.product.create({
              data: {
                sku: uniqueSku,
                name,
                unit: unit || null,
                description: description || null,
                cost: price,
                markupPct: appliedMarkup,
                price: sellingPrice,
                stock,
                usesGlobalMarkup,
                isActive: true,
                inventoryMovements: {
                  create: {
                    movementType: "BULK_IMPORT",
                    quantityDelta: stock,
                    previousStock: 0,
                    newStock: stock,
                    referenceType: "BULK_IMPORT",
                    note: `Bulk import create for ${uniqueSku} (SKU adjusted from ${targetSku})`,
                  },
                },
              },
              select: { id: true },
            });

            const createdSnapshot: ProductSnapshot = {
              id: createdProduct.id,
              sku: uniqueSku,
              name,
              unit: unit || null,
              description: description || null,
              cost: new Prisma.Decimal(price),
              markupPct: new Prisma.Decimal(appliedMarkup),
              price: new Prisma.Decimal(sellingPrice),
              stock,
            };
            reservedSkus.add(uniqueSku);
            existingProductBySku.set(uniqueSku, createdSnapshot);
            existingProductByNameUnit.set(
              toNameUnitKey(name, unit),
              createdSnapshot,
            );

            results.push({
              row,
              productName,
              sku: uniqueSku,
              success: true,
              message: `Created with adjusted SKU (collision on ${targetSku})`,
            });
            continue;
          }

          if (isDuplicateFile) {
            const existingCostBySku = Number(existingBySku.cost);
            const hasSameCostBySku =
              existingCostBySku.toFixed(2) === price.toFixed(2);
            const nextMarkupBySku = hasSameCostBySku
              ? Number(existingBySku.markupPct)
              : appliedMarkup;
            const nextPriceBySku = hasSameCostBySku
              ? Number(existingBySku.price)
              : sellingPrice;
            const priceChangedBySku =
              Number(existingBySku.price) !== nextPriceBySku;

            await prisma.product.update({
              where: { id: existingBySku.id },
              data: {
                name,
                unit: unit || undefined,
                description: description || existingBySku.description,
                cost: hasSameCostBySku ? undefined : price,
                markupPct: nextMarkupBySku,
                price: nextPriceBySku,
                usesGlobalMarkup,
                isActive: true,
              },
            });

            const updatedSnapshot: ProductSnapshot = {
              ...existingBySku,
              name,
              unit: unit || null,
              description: description || existingBySku.description,
              cost: new Prisma.Decimal(
                hasSameCostBySku ? existingCostBySku : price,
              ),
              markupPct: new Prisma.Decimal(nextMarkupBySku),
              price: new Prisma.Decimal(nextPriceBySku),
              stock: existingBySku.stock,
            };
            existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
            existingProductByNameUnit.set(
              toNameUnitKey(name, unit),
              updatedSnapshot,
            );

            results.push({
              row,
              productName,
              sku: existingBySku.sku,
              success: true,
              message: `Updated (stock unchanged)${priceChangedBySku ? ", price changed" : ""}`,
            });
            continue;
          }

          const existingCostBySku = Number(existingBySku.cost);
          const hasSameCostBySku =
            existingCostBySku.toFixed(2) === price.toFixed(2);
          const nextMarkupBySku = hasSameCostBySku
            ? Number(existingBySku.markupPct)
            : appliedMarkup;
          const nextPriceBySku = hasSameCostBySku
            ? Number(existingBySku.price)
            : sellingPrice;
          const priceChangedBySku =
            Number(existingBySku.price) !== nextPriceBySku;
          const newStockBySku = existingBySku.stock + stock;

          await prisma.product.update({
            where: { id: existingBySku.id },
            data: {
              name,
              unit: unit || undefined,
              description: description || existingBySku.description,
              cost: hasSameCostBySku ? undefined : price,
              markupPct: nextMarkupBySku,
              stock: newStockBySku,
              price: nextPriceBySku,
              usesGlobalMarkup,
              isActive: true,
              inventoryMovements: {
                create: {
                  movementType: "BULK_IMPORT",
                  quantityDelta: stock,
                  previousStock: existingBySku.stock,
                  newStock: newStockBySku,
                  referenceType: "BULK_IMPORT",
                  note: `Bulk import update for ${targetSku}`,
                },
              },
            },
          });

          const updatedSnapshot: ProductSnapshot = {
            ...existingBySku,
            name,
            unit: unit || null,
            description: description || existingBySku.description,
            cost: new Prisma.Decimal(
              hasSameCostBySku ? existingCostBySku : price,
            ),
            markupPct: new Prisma.Decimal(nextMarkupBySku),
            price: new Prisma.Decimal(nextPriceBySku),
            stock: newStockBySku,
          };
          existingProductBySku.set(updatedSnapshot.sku, updatedSnapshot);
          existingProductByNameUnit.set(
            toNameUnitKey(name, unit),
            updatedSnapshot,
          );

          results.push({
            row,
            productName,
            sku: targetSku,
            success: true,
            message: priceChangedBySku
              ? `Updated: stock +${stock}, price changed`
              : `Updated: stock +${stock}`,
          });
          continue;
        }

        const createdProduct = await prisma.product.create({
          data: {
            sku: targetSku,
            name,
            unit: unit || null,
            description: description || null,
            cost: price,
            markupPct: appliedMarkup,
            price: sellingPrice,
            stock,
            usesGlobalMarkup,
            isActive: true,
            inventoryMovements: {
              create: {
                movementType: "BULK_IMPORT",
                quantityDelta: stock,
                previousStock: 0,
                newStock: stock,
                referenceType: "BULK_IMPORT",
                note: `Bulk import create for ${targetSku}`,
              },
            },
          },
          select: { id: true },
        });

        const createdSnapshot: ProductSnapshot = {
          id: createdProduct.id,
          sku: targetSku,
          name,
          unit: unit || null,
          description: description || null,
          cost: new Prisma.Decimal(price),
          markupPct: new Prisma.Decimal(appliedMarkup),
          price: new Prisma.Decimal(sellingPrice),
          stock,
        };
        reservedSkus.add(targetSku);
        existingProductBySku.set(targetSku, createdSnapshot);
        existingProductByNameUnit.set(
          toNameUnitKey(name, unit),
          createdSnapshot,
        );

        results.push({
          row,
          productName,
          sku: targetSku,
          success: true,
          message: "Created",
        });
      } catch (error) {
        const detailedMessage = (() => {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
              return "Duplicate value violates a unique field";
            }
            if (error.code === "P2003") {
              return "Related record not found (foreign key constraint)";
            }
            if (error.code === "P2020") {
              return "Invalid value for a database field";
            }
          }

          if (error instanceof Error && error.message.trim().length > 0) {
            return error.message;
          }

          return "Database error";
        })();

        results.push({
          row,
          productName,
          sku: skuForError,
          success: false,
          message: detailedMessage,
        });
      } finally {
        const latestResult = results[results.length - 1];
        if (latestResult?.row === row) {
          if (latestResult.success) {
            successSoFar += 1;
          } else {
            failureSoFar += 1;
          }
        }

        processedRows += 1;

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

        if (processedRows % 25 === 0 || processedRows === totalRows) {
          console.info(
            `[Bulk Import] Processed ${processedRows}/${totalRows} row(s) | Success: ${successSoFar} | Failed: ${failureSoFar}`,
          );
        }
      }
    }

    const successCount = successSoFar;
    const failureCount = failureSoFar;
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
    console.error("Failed to bulk import products", error);

    try {
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to process bulk import";

      if (importJobId) {
        setImportProgress(importJobId, {
          status: "failed",
          phase: "failed",
          message: errorMessage,
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

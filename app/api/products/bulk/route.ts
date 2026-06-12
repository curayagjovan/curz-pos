import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSmartSku } from "@/lib/sku-generator";
import { calculateSellingPrice, calculateBundlePrice } from "@/lib/price-calculator";

type BulkProductData = {
  sku?: string;
  name?: string;
  unit?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
};

type BulkResult = {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BulkMarkupPayload;
    const { products, fileHash } = body;
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

    // Check if this file has been imported recently
    if (fileHash) {
      const recentImport = await prisma.importLog.findUnique({
        where: { fileHash },
      });

      if (recentImport) {
        // File was already imported, warn but allow re-import
        console.warn(
          `[Bulk Import] File with hash ${fileHash} was previously imported on ${recentImport.createdAt}`,
        );
      }
    }

    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      return NextResponse.json(
        { message: "Invalid markupPercent. It must be 0 or higher." },
        { status: 400 },
      );
    }

    if (markupPercent > 0 && filterType !== "all" && filterValue.length === 0) {
      return NextResponse.json(
        { message: "Filter value is required for this markup filter." },
        { status: 400 },
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 },
      );
    }

    const results: BulkResult[] = [];
    const totalRows = products.length;
    let processedRows = 0;

    console.info(`[Bulk Import] Started processing ${totalRows} row(s).`);

    for (const item of products) {
      const rawSku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
      const unit = item.unit?.toString().trim();
      const description = item.description?.toString().trim();
      const price = Number(item.price);
      const stock = Number(item.stock ?? 0);

      if (
        !name ||
        Number.isNaN(price) ||
        price < 0 ||
        Number.isNaN(stock) ||
        stock < 0
      ) {
        results.push({
          sku: rawSku || "(missing)",
          success: false,
          message: "Invalid: name, price, and stock are required",
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

      try {
        const existingByNameAndUnit = rawSku
          ? null
          : await prisma.product.findFirst({
              where: {
                name: { equals: name, mode: "insensitive" },
                unit: unit || null,
              },
            });

        if (existingByNameAndUnit) {
          const newStock = existingByNameAndUnit.stock + stock;
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
            },
          });

          results.push({
            sku: existingByNameAndUnit.sku,
            success: true,
            message: priceChanged
              ? `Updated: stock +${stock}, price changed`
              : `Updated: stock +${stock}`,
          });
          continue;
        }

        const targetSku = rawSku || generateSmartSku(name, unit);

        const existingBySku = await prisma.product.findUnique({
          where: { sku: targetSku },
        });

        if (existingBySku) {
          const newStock = existingBySku.stock + stock;
          const existingCost = Number(existingBySku.cost);
          const hasSameCost = existingCost.toFixed(2) === price.toFixed(2);
          const nextMarkup = hasSameCost
            ? Number(existingBySku.markupPct)
            : appliedMarkup;
          const nextPrice = hasSameCost
            ? Number(existingBySku.price)
            : sellingPrice;
          const priceChanged = Number(existingBySku.price) !== nextPrice;

          await prisma.product.update({
            where: { id: existingBySku.id },
            data: {
              name,
              unit: unit || undefined,
              description: description || existingBySku.description,
              cost: hasSameCost ? undefined : price,
              markupPct: nextMarkup,
              stock: newStock,
              price: nextPrice,
              usesGlobalMarkup,
              isActive: true,
              inventoryMovements: {
                create: {
                  movementType: "BULK_IMPORT",
                  quantityDelta: stock,
                  previousStock: existingBySku.stock,
                  newStock,
                  referenceType: "BULK_IMPORT",
                  note: `Bulk import update for ${targetSku}`,
                },
              },
            },
          });

          results.push({
            sku: targetSku,
            success: true,
            message: priceChanged
              ? `Updated: stock +${stock}, price changed`
              : `Updated: stock +${stock}`,
          });
          continue;
        }

        await prisma.product.create({
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
        });

        results.push({
          sku: targetSku,
          success: true,
          message: "Created",
        });
      } catch {
        results.push({
          sku: rawSku || "(generated)",
          success: false,
          message: "Database error",
        });
      } finally {
        processedRows += 1;
        if (processedRows % 25 === 0 || processedRows === totalRows) {
          const successSoFar = results.filter((r) => r.success).length;
          const failureSoFar = results.length - successSoFar;
          console.info(
            `[Bulk Import] Processed ${processedRows}/${totalRows} row(s) | Success: ${successSoFar} | Failed: ${failureSoFar}`,
          );
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.info(
      `[Bulk Import] Finished ${totalRows} row(s) | Success: ${successCount} | Failed: ${failureCount}`,
    );

    // Log this import for duplicate detection
    if (fileHash) {
      await prisma.importLog.create({
        data: {
          fileHash,
          rowCount: totalRows,
          productCount: products.length,
          successCount,
          failureCount,
        },
      });
    }

    return NextResponse.json(
      {
        message: `Imported ${successCount} product(s), ${failureCount} failed`,
        summary: { successCount, failureCount, total: results.length },
        results,
        isDuplicate: fileHash && results.length === 0 ? false : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to bulk import products", error);
    return NextResponse.json(
      { message: "Unable to process bulk import" },
      { status: 500 },
    );
  }
}

import { Prisma, type PrismaClient } from "@prisma/client";
import { generateSmartSku } from "@/lib/sku-generator";
import { normalizeUnit } from "@/lib/units";
import {
  DEFAULT_PRODUCT_CATEGORY,
  isValidProductCategory,
} from "@/lib/product-categories";
import type {
  BulkProductData,
  BulkResult,
  DbOpFn,
  ProductSnapshot,
} from "@/lib/products/bulk/types";
import {
  describePrismaError,
  findAvailableSkuFromSet,
  toNameUnitKey,
} from "@/lib/products/bulk/helpers";
import type { BulkImportPreload } from "@/lib/products/bulk/preload";

export type PlanBulkImportRowParams = {
  prisma: PrismaClient;
  item: BulkProductData;
  row: number;
  isDuplicateFile: boolean;
  preload: BulkImportPreload;
};

export type PlanBulkImportRowResult = {
  result: BulkResult;
  dbOp: DbOpFn | null;
};

// Decides what a single import row should do — create a new product, update
// an existing one by name+unit or by SKU, or resolve a SKU collision with a
// different-named product — and returns a plain result row plus the DB
// operation (if any) that carries it out. Mutates the preloaded maps/set in
// place so later rows in the same import see products created or updated by
// earlier ones, matching how the un-split loop behaved.
export function planBulkImportRow({
  prisma,
  item,
  row,
  isDuplicateFile,
  preload,
}: PlanBulkImportRowParams): PlanBulkImportRowResult {
  const { existingProductBySku, existingProductByNameUnit, reservedSkus } =
    preload;

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
    return {
      result: {
        row,
        productName,
        sku: rawSku || "(missing)",
        success: false,
        message: "Missing product name",
      },
      dbOp: null,
    };
  }
  if (Number.isNaN(price)) {
    return {
      result: {
        row,
        productName,
        sku: rawSku || name,
        success: false,
        message: `Invalid price: '${item.price}' is not a number`,
      },
      dbOp: null,
    };
  }
  if (price < 0) {
    return {
      result: {
        row,
        productName,
        sku: rawSku || name,
        success: false,
        message: `Invalid price: ${price} cannot be negative`,
      },
      dbOp: null,
    };
  }
  if (Number.isNaN(stock)) {
    return {
      result: {
        row,
        productName,
        sku: rawSku || name,
        success: false,
        message: `Invalid stock: '${item.stock}' is not a number`,
      },
      dbOp: null,
    };
  }
  if (stock < 0) {
    return {
      result: {
        row,
        productName,
        sku: rawSku || name,
        success: false,
        message: `Invalid stock: ${stock} cannot be negative`,
      },
      dbOp: null,
    };
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
      const priceChanged = Number(existingByNameAndUnit.price) !== nextPrice;
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
      existingProductByNameUnit.set(toNameUnitKey(name, unit), updatedSnapshot);

      const productId = existingByNameAndUnit.id;
      const prevStock = existingByNameAndUnit.stock;
      const existingDescription = existingByNameAndUnit.description;

      return {
        result: {
          row,
          productName,
          sku: existingByNameAndUnit.sku,
          success: true,
          message: isDuplicateFile
            ? `Updated (stock unchanged)${priceChanged ? ", price changed" : ""}`
            : priceChanged
              ? `Updated: stock +${importedStock}, price changed`
              : `Updated: stock +${importedStock}`,
        },
        dbOp: () =>
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
      };
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
        existingBySku.name.trim().toLowerCase() === name.trim().toLowerCase();

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
        existingProductByNameUnit.set(toNameUnitKey(name, unit), createdSnapshot);

        return {
          result: {
            row,
            productName,
            sku: uniqueSku,
            success: true,
            message: `Created with adjusted SKU (collision on ${targetSku})`,
          },
          dbOp: () =>
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
        };
      }

      if (isDuplicateFile) {
        const nextMarkupBySku = appliedMarkup;
        const nextPriceBySku = sellingPrice;
        const priceChangedBySku = Number(existingBySku.price) !== nextPriceBySku;

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
        existingProductByNameUnit.set(toNameUnitKey(name, unit), updatedSnapshot);

        const productId = existingBySku.id;
        const existingDescriptionBySku = existingBySku.description;

        return {
          result: {
            row,
            productName,
            sku: existingBySku.sku,
            success: true,
            message: `Updated (stock unchanged)${priceChangedBySku ? ", price changed" : ""}`,
          },
          dbOp: () =>
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
        };
      }

      const nextMarkupBySku = appliedMarkup;
      const nextPriceBySku = sellingPrice;
      const priceChangedBySku = Number(existingBySku.price) !== nextPriceBySku;
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
      existingProductByNameUnit.set(toNameUnitKey(name, unit), updatedSnapshot);

      const productId = existingBySku.id;
      const prevStockBySku = existingBySku.stock;
      const existingDescriptionBySku = existingBySku.description;

      return {
        result: {
          row,
          productName,
          sku: targetSku,
          success: true,
          message: priceChangedBySku
            ? `Updated: stock +${importedStock}, price changed`
            : `Updated: stock +${importedStock}`,
        },
        dbOp: () =>
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
      };
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
    existingProductByNameUnit.set(toNameUnitKey(name, unit), createdSnapshot);

    return {
      result: {
        row,
        productName,
        sku: targetSku,
        success: true,
        message: "Created",
      },
      dbOp: () =>
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
    };
  } catch (error) {
    return {
      result: {
        row,
        productName,
        sku: skuForError,
        success: false,
        message: describePrismaError(error),
      },
      dbOp: null,
    };
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeSkuBase(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "PRODUCT"
  );
}

async function getNextSequentialSku(baseInput: string) {
  const base = normalizeSkuBase(baseInput);
  const existing = await prisma.product.findMany({
    where: { sku: { startsWith: `${base}-` } },
    select: { sku: true },
  });

  let maxSequence = 0;
  for (const item of existing) {
    const match = item.sku.match(new RegExp(`^${base}-(\\d+)$`));
    if (!match) {
      continue;
    }

    const sequence = Number(match[1]);
    if (!Number.isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return `${base}-${String(maxSequence + 1).padStart(3, "0")}`;
}

type BulkProductData = {
  sku?: string;
  name?: string;
  description?: string;
  price?: number | string;
  stock?: number | string;
};

type BulkResult = {
  sku: string;
  success: boolean;
  message: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { products: BulkProductData[] };
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { message: "No products provided" },
        { status: 400 },
      );
    }

    const results: BulkResult[] = [];

    for (const item of products) {
      const rawSku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
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

      try {
        const targetSku = rawSku || (await getNextSequentialSku(name));

        const existingBySku = await prisma.product.findUnique({
          where: { sku: targetSku },
        });

        if (existingBySku) {
          const newStock = existingBySku.stock + stock;
          const priceChanged = Number(existingBySku.price) !== price;

          await prisma.product.update({
            where: { id: existingBySku.id },
            data: {
              name,
              description: description || existingBySku.description,
              stock: newStock,
              price,
              isActive: true,
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
            description: description || null,
            price,
            stock,
            isActive: true,
          },
        });

        results.push({
          sku: targetSku,
          success: true,
          message: "Created",
        });
      } catch (error) {
        results.push({
          sku: rawSku || "(generated)",
          success: false,
          message: "Database error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        message: `Imported ${successCount} product(s), ${failureCount} failed`,
        summary: { successCount, failureCount, total: results.length },
        results,
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

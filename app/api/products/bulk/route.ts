import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      const sku = item.sku?.toString().trim();
      const name = item.name?.toString().trim();
      const description = item.description?.toString().trim();
      const price = Number(item.price);
      const stock = Number(item.stock ?? 0);

      if (!sku || !name || Number.isNaN(price) || price < 0) {
        results.push({
          sku: sku || "(missing)",
          success: false,
          message: "Invalid: sku, name, and price required",
        });
        continue;
      }

      try {
        await prisma.product.create({
          data: {
            sku,
            name,
            description: description || null,
            price,
            stock,
            isActive: true,
          },
        });

        results.push({
          sku,
          success: true,
          message: "Created",
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          results.push({
            sku,
            success: false,
            message: "SKU already exists",
          });
        } else {
          results.push({
            sku,
            success: false,
            message: "Database error",
          });
        }
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

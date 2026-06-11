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

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to load products", error);
    return NextResponse.json(
      { message: "Unable to load products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sku?: string;
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
    };

    const rawSku = body.sku?.trim();
    const name = body.name?.trim();
    const description = body.description?.trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    if (
      !name ||
      Number.isNaN(price) ||
      price < 0 ||
      Number.isNaN(stock) ||
      stock < 0
    ) {
      return NextResponse.json(
        {
          message: "Invalid payload. name, price, and stock are required.",
        },
        { status: 400 },
      );
    }

    const baseForSequence = rawSku?.replace(/-\d+$/, "") || name;
    const isSequentialPattern = !rawSku || /-\d+$/.test(rawSku);

    if (isSequentialPattern) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const nextSku = await getNextSequentialSku(baseForSequence);

        try {
          const product = await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
              data: {
                sku: nextSku,
                name,
                description: description || null,
                price,
                stock,
                isActive: true,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: created.id,
                movementType: "RESTOCK",
                quantityDelta: stock,
                previousStock: 0,
                newStock: stock,
                referenceType: "PRODUCT_CREATE",
                referenceId: created.id,
                note: `Initial stock for ${nextSku}`,
              },
            });

            return created;
          });

          return NextResponse.json(product, { status: 201 });
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "P2002"
          ) {
            continue;
          }

          throw error;
        }
      }

      return NextResponse.json(
        { message: "Unable to generate a unique SKU. Please try again." },
        { status: 409 },
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: rawSku,
          name,
          description: description || null,
          price,
          stock,
          isActive: true,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: created.id,
          movementType: "RESTOCK",
          quantityDelta: stock,
          previousStock: 0,
          newStock: stock,
          referenceType: "PRODUCT_CREATE",
          referenceId: created.id,
          note: `Initial stock for ${rawSku}`,
        },
      });

      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { message: "SKU already exists." },
        { status: 409 },
      );
    }

    console.error("Failed to create product", error);
    return NextResponse.json(
      { message: "Unable to create product" },
      { status: 500 },
    );
  }
}

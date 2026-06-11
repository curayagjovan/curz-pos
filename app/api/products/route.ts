import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const sku = body.sku?.trim();
    const name = body.name?.trim();
    const description = body.description?.trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    if (
      !sku ||
      !name ||
      Number.isNaN(price) ||
      price < 0 ||
      Number.isNaN(stock) ||
      stock < 0
    ) {
      return NextResponse.json(
        {
          message: "Invalid payload. sku, name, price, and stock are required.",
        },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || null,
        price,
        stock,
        isActive: true,
      },
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

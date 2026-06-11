import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to load product", error);
    return NextResponse.json(
      { message: "Unable to load product" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        description: description || null,
        price,
        stock,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

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

    console.error("Failed to update product", error);
    return NextResponse.json(
      { message: "Unable to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 },
      );
    }

    console.error("Failed to delete product", error);
    return NextResponse.json(
      { message: "Unable to delete product" },
      { status: 500 },
    );
  }
}

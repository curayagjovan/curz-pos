import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const id = await resolveId(context);

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
    const id = await resolveId(context);
    const body = (await request.json()) as {
      sku?: string;
      name?: string;
      unit?: string;
      description?: string;
      bundleQty?: number | null;
      bundlePrice?: number | null;
      price?: number;
    };

    const sku = body.sku?.trim();
    const name = body.name?.trim();
    const unit = body.unit?.trim();
    const description = body.description?.trim();
    const bundleQty =
      body.bundleQty === null || body.bundleQty === undefined
        ? null
        : Number(body.bundleQty);
    const bundlePrice =
      body.bundlePrice === null || body.bundlePrice === undefined
        ? null
        : Number(body.bundlePrice);
    const price = Number(body.price);

    const hasBundle = bundleQty !== null || bundlePrice !== null;
    const hasInvalidBundle =
      (bundleQty !== null && (Number.isNaN(bundleQty) || bundleQty < 2)) ||
      (bundlePrice !== null && (Number.isNaN(bundlePrice) || bundlePrice < 0));
    const hasIncompleteBundle =
      hasBundle && (bundleQty === null || bundlePrice === null);

    if (
      !sku ||
      !name ||
      hasInvalidBundle ||
      hasIncompleteBundle ||
      Number.isNaN(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          message: "Invalid payload. sku, name, and price are required.",
        },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        unit: unit || null,
        description: description || null,
        cost: price,
        markupPct: 0,
        bundleQty,
        bundleMarkdownPct: null,
        bundlePrice,
        price,
        usesGlobalMarkup: false,
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

export async function PATCH(request: Request, context: RouteContext) {
  return PUT(request, context);
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const id = await resolveId(context);

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

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

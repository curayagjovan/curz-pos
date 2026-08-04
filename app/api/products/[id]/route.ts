import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSmartSku } from "@/lib/sku-generator";
import { requirePermission, requireUser } from "@/lib/auth/require-user";
import { AUDIT_ACTIONS, diffFields, recordAudit } from "@/lib/audit";
import { parseBundleTiersInput } from "@/lib/bundle-pricing";
import {
  DEFAULT_PRODUCT_CATEGORY,
  isValidProductCategory,
} from "@/lib/product-categories";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function GET(_: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const id = await resolveId(context);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        bundleTiers: {
          select: { quantity: true, price: true },
          orderBy: { quantity: "asc" },
        },
      },
    });
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
  const auth = await requirePermission("MANAGE_PRODUCTS");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const id = await resolveId(context);
    const body = (await request.json()) as {
      name?: string;
      unit?: string;
      category?: string;
      description?: string;
      bundleTiers?: unknown;
      price?: number;
    };

    const name = body.name?.trim();
    const unit = body.unit?.trim();
    const category = isValidProductCategory(body.category)
      ? body.category
      : DEFAULT_PRODUCT_CATEGORY;
    const description = body.description?.trim();
    const price = Number(body.price);
    const parsedBundleTiers = parseBundleTiersInput(body.bundleTiers);

    if (
      !name ||
      !parsedBundleTiers.ok ||
      Number.isNaN(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          message: "Invalid payload. name and price are required.",
        },
        { status: 400 },
      );
    }

    const bundleTiers = parsedBundleTiers.tiers;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        name: true,
        unit: true,
        category: true,
        description: true,
        price: true,
        bundleTiers: { select: { quantity: true, price: true } },
      },
    });

    // Always regenerate SKU from the latest name/price during edits.
    const baseSku = generateSmartSku(name, price);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const nextSku =
        attempt === 0
          ? baseSku
          : `${baseSku}-${String(attempt + 1).padStart(2, "0")}`;

      try {
        const product = await prisma.product.update({
          where: { id },
          data: {
            sku: nextSku,
            name,
            unit: unit || null,
            category,
            description: description || null,
            cost: price,
            markupPct: 0,
            bundleTiers: { deleteMany: {}, create: bundleTiers },
            price,
            usesGlobalMarkup: false,
          },
          include: {
            bundleTiers: {
              select: { quantity: true, price: true },
              orderBy: { quantity: "asc" },
            },
          },
        });

        if (existingProduct) {
          const changes = diffFields(
            {
              name: existingProduct.name,
              unit: existingProduct.unit,
              category: existingProduct.category,
              description: existingProduct.description,
              bundleTiers: existingProduct.bundleTiers
                .map((tier) => ({ quantity: tier.quantity, price: Number(tier.price) }))
                .sort((left, right) => left.quantity - right.quantity),
              price: Number(existingProduct.price),
            },
            {
              name,
              unit: unit || null,
              category,
              description: description || null,
              bundleTiers,
              price,
            },
          );

          if (Object.keys(changes).length > 0) {
            await recordAudit({
              actor: auth.appUser,
              action: AUDIT_ACTIONS.PRODUCT_UPDATE,
              entityType: "Product",
              entityId: product.id,
              summary: `Updated product ${product.name}`,
              changes,
            });
          }
        }

        return NextResponse.json(product);
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
  const auth = await requirePermission("MANAGE_PRODUCTS");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const id = await resolveId(context);

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAudit({
      actor: auth.appUser,
      action: AUDIT_ACTIONS.PRODUCT_DELETE,
      entityType: "Product",
      entityId: product.id,
      summary: `Deleted product ${product.name} (${product.sku})`,
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

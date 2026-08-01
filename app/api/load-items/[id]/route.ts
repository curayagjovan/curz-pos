import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOAD_BRANDS, type LoadBrand, type LoadCategory } from "@/lib/mobile-load-catalog";
import { requirePermission } from "@/lib/auth/require-user";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

function resolveGroup(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.group ?? null;
}

function buildSkuPrefix(category: LoadCategory) {
  return category === "Data Promo" ? "PROMO" : "LOAD";
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requirePermission("MANAGE_LOAD_ITEMS");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const id = await resolveId(context);
    const body = (await request.json()) as {
      brand?: string;
      category?: string;
      code?: string;
      amount?: number;
      label?: string;
      description?: string | null;
    };

    const brand = body.brand?.trim() as LoadBrand | undefined;
    const category = body.category?.trim() as LoadCategory | undefined;
    const code = body.code?.trim();
    const label = body.label?.trim();
    const description = body.description?.trim() || null;
    const amount = Number(body.amount);

    const validBrands: LoadBrand[] = ["GLOBE", "TM", "SMART", "TNT", "DITO"];
    const validCategories: LoadCategory[] = ["Regular Load", "Data Promo"];

    if (
      !brand ||
      !validBrands.includes(brand) ||
      !category ||
      !validCategories.includes(category) ||
      !code ||
      !label ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid payload. brand, category, code, label, and a positive amount are required.",
        },
        { status: 400 },
      );
    }

    const group = resolveGroup(brand);
    if (!group) {
      return NextResponse.json(
        { message: "Unable to resolve network group for brand" },
        { status: 400 },
      );
    }

    const skuPrefix = buildSkuPrefix(category);
    const prismaCategory = category === "Data Promo" ? "DATA_PROMO" : "REGULAR_LOAD";
    const baseSku = `${skuPrefix}-${brand}-${code}`.toUpperCase();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextSku =
        attempt === 0 ? baseSku : `${baseSku}-${String(attempt + 1).padStart(2, "0")}`;

      try {
        const loadItem = await prisma.loadItem.update({
          where: { id },
          data: {
            sku: nextSku,
            brand,
            group: group as never,
            category: prismaCategory as never,
            code,
            amount,
            label,
            description,
          },
        });

        await prisma.product.update({
          where: { id },
          data: {
            sku: nextSku,
            name: label,
            price: amount,
          },
        });

        return NextResponse.json(loadItem);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          continue;
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          return NextResponse.json(
            { message: "Load item not found" },
            { status: 404 },
          );
        }

        throw error;
      }
    }

    return NextResponse.json(
      { message: "Unable to generate a unique SKU. Please try again." },
      { status: 409 },
    );
  } catch (error) {
    console.error("Failed to update load item", error);
    return NextResponse.json(
      { message: "Unable to update load item" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const auth = await requirePermission("MANAGE_LOAD_ITEMS");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const id = await resolveId(context);

    await prisma.loadItem.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Load item deleted successfully" });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Load item not found" },
        { status: 404 },
      );
    }

    console.error("Failed to delete load item", error);
    return NextResponse.json(
      { message: "Unable to delete load item" },
      { status: 500 },
    );
  }
}

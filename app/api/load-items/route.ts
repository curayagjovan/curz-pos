import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOAD_BRANDS, type LoadBrand, type LoadCategory } from "@/lib/mobile-load-catalog";

function resolveGroup(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.group ?? null;
}

function buildSkuPrefix(category: LoadCategory) {
  return category === "Data Promo" ? "PROMO" : "LOAD";
}

export async function GET() {
  try {
    const loadItems = await prisma.loadItem.findMany({
      where: { isActive: true },
      orderBy: [{ brand: "asc" }, { amount: "asc" }],
    });

    return NextResponse.json(loadItems);
  } catch (error) {
    console.error("Failed to load load items", error);
    return NextResponse.json(
      { message: "Unable to load load items" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
        const loadItem = await prisma.loadItem.create({
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

        // Mirror into Product so OrderItem's FK constraint resolves when this
        // load item is sold, without exposing it in the regular Inventory list.
        await prisma.product.create({
          data: {
            id: loadItem.id,
            sku: nextSku,
            name: label,
            unit: "load",
            price: amount,
            cost: 0,
            stock: 0,
            isActive: true,
            usesGlobalMarkup: false,
          },
        });

        return NextResponse.json(loadItem, { status: 201 });
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
    console.error("Failed to create load item", error);
    return NextResponse.json(
      { message: "Unable to create load item" },
      { status: 500 },
    );
  }
}

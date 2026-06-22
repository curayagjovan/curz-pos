import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSmartSku } from "@/lib/sku-generator";

type CursorToken = {
  name: string;
  id: string;
};

function encodeCursorToken(token: CursorToken) {
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
}

function decodeCursorToken(cursor: string): CursorToken | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as CursorToken;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string"
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const cursorParam = url.searchParams.get("cursor")?.trim() || null;
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const skipParam = Number(url.searchParams.get("skip") ?? "0");
    const limitParam = Number(url.searchParams.get("limit") ?? "18");
    const hasPaginationParams =
      url.searchParams.has("cursor") ||
      url.searchParams.has("page") ||
      url.searchParams.has("skip") ||
      url.searchParams.has("limit") ||
      url.searchParams.has("q");

    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const skip =
      url.searchParams.has("skip") && !Number.isNaN(skipParam) && skipParam >= 0
        ? skipParam
        : (page - 1) * limitParam;
    const limit =
      Number.isNaN(limitParam) || limitParam < 1
        ? 18
        : Math.min(limitParam, 60);
    const baseWhere: Prisma.ProductWhereInput = {
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { sku: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    if (!hasPaginationParams) {
      const products = await prisma.product.findMany({
        where: baseWhere,
        orderBy: { name: "asc" },
      });

      return NextResponse.json(products);
    }

    if (
      (url.searchParams.has("page") || url.searchParams.has("skip")) &&
      !url.searchParams.has("cursor")
    ) {
      const products = await prisma.product.findMany({
        where: baseWhere,
        orderBy: { name: "asc" },
        skip,
        take: limit + 1,
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          bundleQty: true,
          bundlePrice: true,
          stock: true,
        },
      });

      const total = await prisma.product.count({ where: baseWhere });
      const hasMore = products.length > limit;
      const items = hasMore ? products.slice(0, limit) : products;

      return NextResponse.json({ items, total, hasMore });
    }

    let cursorWhere: Prisma.ProductWhereInput = baseWhere;
    if (cursorParam) {
      const decoded = decodeCursorToken(cursorParam);
      if (decoded) {
        cursorWhere = {
          ...baseWhere,
          AND: [
            {
              OR: [
                { name: { gt: decoded.name } },
                {
                  AND: [{ name: decoded.name }, { id: { gt: decoded.id } }],
                },
              ],
            },
          ],
        };
      } else {
        const cursorProduct = await prisma.product.findUnique({
          where: { id: cursorParam },
          select: { id: true, name: true },
        });

        if (cursorProduct) {
          cursorWhere = {
            ...baseWhere,
            AND: [
              {
                OR: [
                  { name: { gt: cursorProduct.name } },
                  {
                    AND: [
                      { name: cursorProduct.name },
                      { id: { gt: cursorProduct.id } },
                    ],
                  },
                ],
              },
            ],
          };
        }
      }
    }

    const products = await prisma.product.findMany({
      where: cursorWhere,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: limit + 1,
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        bundleQty: true,
        bundlePrice: true,
        stock: true,
      },
    });

    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const nextCursor = hasMore
      ? (() => {
          const last = items[items.length - 1];
          if (!last) {
            return null;
          }

          return encodeCursorToken({ id: last.id, name: last.name });
        })()
      : null;

    return NextResponse.json({
      items,
      limit,
      hasMore,
      nextCursor,
    });
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
      unit?: string;
      description?: string;
      cost?: number;
      markupPercent?: number;
      bundleQty?: number | null;
      bundleMarkdownPercent?: number | null;
      bundlePrice?: number | null;
      price?: number;
      stock?: number;
    };

    const rawSku = body.sku?.trim();
    const name = body.name?.trim();
    const unit = body.unit?.trim();
    const description = body.description?.trim();
    const cost = Number(body.cost ?? 0);
    const markupPercent = Number(body.markupPercent ?? 0);
    const bundleQty =
      body.bundleQty === null || body.bundleQty === undefined
        ? null
        : Number(body.bundleQty);
    const bundleMarkdownPercent =
      body.bundleMarkdownPercent === null ||
      body.bundleMarkdownPercent === undefined
        ? null
        : Number(body.bundleMarkdownPercent);
    const bundlePrice =
      body.bundlePrice === null || body.bundlePrice === undefined
        ? null
        : Number(body.bundlePrice);
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    const hasBundle = bundleQty !== null || bundlePrice !== null;

    const hasInvalidBundle =
      (bundleQty !== null && (Number.isNaN(bundleQty) || bundleQty < 2)) ||
      (bundleMarkdownPercent !== null &&
        (Number.isNaN(bundleMarkdownPercent) ||
          bundleMarkdownPercent < 0 ||
          bundleMarkdownPercent > 100)) ||
      (bundlePrice !== null && (Number.isNaN(bundlePrice) || bundlePrice < 0));

    const hasIncompleteBundle =
      hasBundle && (bundleQty === null || bundlePrice === null);

    if (
      !name ||
      Number.isNaN(cost) ||
      cost < 0 ||
      Number.isNaN(markupPercent) ||
      markupPercent < 0 ||
      hasInvalidBundle ||
      hasIncompleteBundle ||
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

    const shouldAutoGenerateSku = !rawSku;

    if (shouldAutoGenerateSku) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const nextSku = generateSmartSku(name, unit);

        try {
          const product = await prisma.product.create({
            data: {
              sku: nextSku,
              name,
              unit: unit || null,
              description: description || null,
              cost,
              markupPct: markupPercent,
              bundleQty,
              bundleMarkdownPct: bundleMarkdownPercent,
              bundlePrice,
              price,
              stock,
              isActive: true,
              usesGlobalMarkup: false,
              inventoryMovements: {
                create: {
                  movementType: "RESTOCK",
                  quantityDelta: stock,
                  previousStock: 0,
                  newStock: stock,
                  referenceType: "PRODUCT_CREATE",
                  note: `Initial stock for ${nextSku}`,
                },
              },
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

    const product = await prisma.product.create({
      data: {
        sku: rawSku,
        name,
        unit: unit || null,
        description: description || null,
        cost,
        markupPct: markupPercent,
        bundleQty,
        bundleMarkdownPct: bundleMarkdownPercent,
        bundlePrice,
        price,
        stock,
        isActive: true,
        usesGlobalMarkup: false,
        inventoryMovements: {
          create: {
            movementType: "RESTOCK",
            quantityDelta: stock,
            previousStock: 0,
            newStock: stock,
            referenceType: "PRODUCT_CREATE",
            note: `Initial stock for ${rawSku}`,
          },
        },
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

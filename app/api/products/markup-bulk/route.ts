import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MarkupBulkPayload = {
  markupPercent?: number;
  filterType?: "all" | "unit" | "category" | "productType";
  filterValue?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarkupBulkPayload;
    const markupPercent = Number(body.markupPercent);
    const filterType = body.filterType ?? "all";
    const filterValue = body.filterValue?.trim() ?? "";

    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      return NextResponse.json(
        { message: "Invalid markupPercent. It must be 0 or higher." },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (filterType === "unit") {
      if (!filterValue) {
        return NextResponse.json(
          { message: "Unit is required for unit filter." },
          { status: 400 },
        );
      }
      where.unit = { equals: filterValue, mode: "insensitive" };
    }

    if (filterType === "category" || filterType === "productType") {
      if (!filterValue) {
        return NextResponse.json(
          { message: "Keyword is required for this filter." },
          { status: 400 },
        );
      }
      where.OR = [
        { name: { contains: filterValue, mode: "insensitive" } },
        { description: { contains: filterValue, mode: "insensitive" } },
      ];
    }

    // Build a single SQL UPDATE so we avoid N round-trips through the pooler.
    // price = cost * (1 + markupPct/100) rounded to 2 decimal places
    let updatedCount: number;

    if (filterType === "all") {
      const result = await prisma.$executeRaw`
        UPDATE "Product"
        SET    "markupPct"  = ${markupPercent},
               "price"     = ROUND(CAST("cost" AS numeric) * (1 + ${markupPercent}::numeric / 100), 2),
               "updatedAt" = NOW()
        WHERE  "isActive" = true
      `;
      updatedCount = result;
    } else if (filterType === "unit") {
      const result = await prisma.$executeRaw`
        UPDATE "Product"
        SET    "markupPct"  = ${markupPercent},
               "price"     = ROUND(CAST("cost" AS numeric) * (1 + ${markupPercent}::numeric / 100), 2),
               "updatedAt" = NOW()
        WHERE  "isActive" = true
          AND  LOWER("unit") = LOWER(${filterValue})
      `;
      updatedCount = result;
    } else {
      // category / productType — keyword match on name or description
      const keyword = `%${filterValue}%`;
      const result = await prisma.$executeRaw`
        UPDATE "Product"
        SET    "markupPct"  = ${markupPercent},
               "price"     = ROUND(CAST("cost" AS numeric) * (1 + ${markupPercent}::numeric / 100), 2),
               "updatedAt" = NOW()
        WHERE  "isActive" = true
          AND  (LOWER("name") LIKE LOWER(${keyword}) OR LOWER("description") LIKE LOWER(${keyword}))
      `;
      updatedCount = result;
    }

    if (updatedCount === 0) {
      return NextResponse.json(
        { message: "No matching products found.", updatedCount: 0 },
        { status: 200 },
      );
    }

    await prisma.appSetting.upsert({
      where: { id: 1 },
      update: {
        globalMarkupPercent: markupPercent,
        globalMarkupFilterType: filterType,
        globalMarkupFilterValue: filterValue,
      },
      create: {
        id: 1,
        themeMode: "light",
        globalMarkupPercent: markupPercent,
        globalMarkupFilterType: filterType,
        globalMarkupFilterValue: filterValue,
      },
    });

    return NextResponse.json({
      message: `Updated ${updatedCount} product(s) using the global markup value (${markupPercent}%).`,
      updatedCount,
    });
  } catch (error) {
    console.error("Failed to apply bulk markup", error);
    return NextResponse.json(
      { message: "Unable to apply bulk markup" },
      { status: 500 },
    );
  }
}

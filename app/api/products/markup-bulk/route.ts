import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      usesGlobalMarkup: true,
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

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        cost: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { message: "No matching products found.", updatedCount: 0 },
        { status: 200 },
      );
    }

    const operations = products.map((product) => {
      const cost = Number(product.cost);
      const nextPrice = Number((cost * (1 + markupPercent / 100)).toFixed(2));

      return prisma.product.update({
        where: { id: product.id },
        data: {
          markupPct: markupPercent,
          price: nextPrice,
        },
      });
    });

    await prisma.$transaction(operations);

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
      message: `Updated ${products.length} product(s) using the global markup value (${markupPercent}%).`,
      updatedCount: products.length,
    });
  } catch (error) {
    console.error("Failed to apply bulk markup", error);
    return NextResponse.json(
      { message: "Unable to apply bulk markup" },
      { status: 500 },
    );
  }
}

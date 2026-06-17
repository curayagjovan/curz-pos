import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SettingsPayload = {
  themeMode?: "light" | "dark";
  globalMarkupPercent?: number;
  globalMarkupFilterType?: "all" | "unit" | "category" | "productType";
  globalMarkupFilterValue?: string;
};

async function getOrCreateSettings() {
  return prisma.appSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      themeMode: "light",
      globalMarkupPercent: 0,
      globalMarkupFilterType: "all",
      globalMarkupFilterValue: "",
    },
  });
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();

    return NextResponse.json({
      themeMode: settings.themeMode,
      globalMarkupPercent: Number(settings.globalMarkupPercent),
      globalMarkupFilterType: settings.globalMarkupFilterType,
      globalMarkupFilterValue: settings.globalMarkupFilterValue ?? "",
    });
  } catch (error) {
    console.error("Failed to load app settings", error);
    return NextResponse.json(
      { message: "Unable to load app settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SettingsPayload;

    const updateData: {
      themeMode?: "light" | "dark";
      globalMarkupPercent?: number;
      globalMarkupFilterType?: "all" | "unit" | "category" | "productType";
      globalMarkupFilterValue?: string;
    } = {};

    if (body.themeMode !== undefined) {
      if (body.themeMode !== "light" && body.themeMode !== "dark") {
        return NextResponse.json(
          { message: "Invalid themeMode value." },
          { status: 400 },
        );
      }
      updateData.themeMode = body.themeMode;
    }

    if (body.globalMarkupPercent !== undefined) {
      const nextMarkup = Number(body.globalMarkupPercent);
      if (Number.isNaN(nextMarkup) || nextMarkup < 0) {
        return NextResponse.json(
          { message: "Invalid globalMarkupPercent. It must be 0 or higher." },
          { status: 400 },
        );
      }
      updateData.globalMarkupPercent = nextMarkup;
    }

    if (body.globalMarkupFilterType !== undefined) {
      const validFilterTypes = ["all", "unit", "category", "productType"];
      if (!validFilterTypes.includes(body.globalMarkupFilterType)) {
        return NextResponse.json(
          { message: "Invalid globalMarkupFilterType value." },
          { status: 400 },
        );
      }
      updateData.globalMarkupFilterType = body.globalMarkupFilterType;
    }

    if (body.globalMarkupFilterValue !== undefined) {
      updateData.globalMarkupFilterValue = body.globalMarkupFilterValue.trim();
    }

    const settings = await prisma.appSetting.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        themeMode: updateData.themeMode ?? "light",
        globalMarkupPercent: updateData.globalMarkupPercent ?? 0,
        globalMarkupFilterType: updateData.globalMarkupFilterType ?? "all",
        globalMarkupFilterValue: updateData.globalMarkupFilterValue ?? "",
      },
    });

    return NextResponse.json({
      themeMode: settings.themeMode,
      globalMarkupPercent: Number(settings.globalMarkupPercent),
      globalMarkupFilterType: settings.globalMarkupFilterType,
      globalMarkupFilterValue: settings.globalMarkupFilterValue ?? "",
    });
  } catch (error) {
    console.error("Failed to save app settings", error);
    return NextResponse.json(
      { message: "Unable to save app settings" },
      { status: 500 },
    );
  }
}

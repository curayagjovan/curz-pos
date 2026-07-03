import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SettingsPayload = {
  themeMode?: "light" | "dark";
};

async function getOrCreateSettings() {
  return prisma.appSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      themeMode: "light",
    },
  });
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();

    return NextResponse.json({
      themeMode: settings.themeMode,
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

    const settings = await prisma.appSetting.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        themeMode: updateData.themeMode ?? "light",
      },
    });

    return NextResponse.json({
      themeMode: settings.themeMode,
    });
  } catch (error) {
    console.error("Failed to save app settings", error);
    return NextResponse.json(
      { message: "Unable to save app settings" },
      { status: 500 },
    );
  }
}

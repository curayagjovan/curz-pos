import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.product.count({
      where: { isActive: true },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to load product count", error);

    return NextResponse.json(
      { message: "Unable to load product count" },
      { status: 500 },
    );
  }
}

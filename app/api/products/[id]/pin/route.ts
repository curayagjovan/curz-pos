import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { isPinned } = body;

    if (typeof isPinned !== "boolean") {
      return NextResponse.json(
        { error: "isPinned must be a boolean" },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isPinned },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error pinning product:", error);
    return NextResponse.json(
      { error: "Failed to pin product" },
      { status: 500 },
    );
  }
}

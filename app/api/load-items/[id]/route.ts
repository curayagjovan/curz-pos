import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function resolveId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function DELETE(_: Request, context: RouteContext) {
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

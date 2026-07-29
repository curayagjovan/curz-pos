import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const count = await prisma.product.count({
      where: { isActive: true, NOT: { sku: { startsWith: "LOAD-" } } },
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

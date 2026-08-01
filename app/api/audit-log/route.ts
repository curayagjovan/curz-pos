import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-user";

export async function GET(request: Request) {
  const auth = await requirePermission("VIEW_AUDIT_LOG");
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim() || null;
    const entityType = url.searchParams.get("entityType")?.trim() || null;
    const actorId = url.searchParams.get("actorId")?.trim() || null;
    const takeParam = Number(url.searchParams.get("take") ?? "50");
    const take =
      Number.isNaN(takeParam) || takeParam < 1 ? 50 : Math.min(takeParam, 100);

    const where = {
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
    };

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > take;
    const items = hasMore ? entries.slice(0, take) : entries;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({ items, hasMore, nextCursor });
  } catch (error) {
    console.error("Failed to load audit log", error);
    return NextResponse.json(
      { message: "Unable to load audit log" },
      { status: 500 },
    );
  }
}

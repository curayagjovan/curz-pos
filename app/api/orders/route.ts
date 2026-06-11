import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderItemInput = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
};

type OrderPayload = {
  status?: "PAID" | "CANCELLED" | "PENDING";
  subtotal?: number;
  tax?: number;
  total?: number;
  note?: string;
  items?: OrderItemInput[];
};

function createOrderNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${stamp}-${suffix}`;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNo: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        note: true,
        createdAt: true,
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to load orders", error);
    return NextResponse.json(
      { message: "Unable to load orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderPayload;
    const status = body.status ?? "PAID";
    const subtotal = Number(body.subtotal);
    const tax = Number(body.tax);
    const total = Number(body.total);
    const note = body.note?.trim() || null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (
      !["PAID", "CANCELLED", "PENDING"].includes(status) ||
      Number.isNaN(subtotal) ||
      Number.isNaN(tax) ||
      Number.isNaN(total) ||
      subtotal < 0 ||
      tax < 0 ||
      total < 0 ||
      items.length === 0
    ) {
      return NextResponse.json(
        { message: "Invalid order payload" },
        { status: 400 },
      );
    }

    for (const item of items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (
        !item.productId ||
        !item.productName ||
        Number.isNaN(quantity) ||
        quantity <= 0 ||
        Number.isNaN(unitPrice) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          { message: "Invalid order items" },
          { status: 400 },
        );
      }
    }

    const itemTotalsByProduct = new Map<string, number>();
    for (const item of items) {
      const productId = item.productId as string;
      const quantity = Number(item.quantity);
      itemTotalsByProduct.set(
        productId,
        (itemTotalsByProduct.get(productId) ?? 0) + quantity,
      );
    }

    const productIds = Array.from(itemTotalsByProduct.keys());
    const stockSnapshot = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true },
    });

    const stockById = new Map(stockSnapshot.map((p) => [p.id, p]));
    for (const [productId, quantity] of itemTotalsByProduct) {
      const current = stockById.get(productId);
      if (!current) {
        throw new Error("Product not found during checkout");
      }
      if (status === "PAID" && current.stock < quantity) {
        throw new Error(`Insufficient stock for ${current.name}`);
      }
    }

    const orderId = crypto.randomUUID();
    const orderNo = createOrderNo();
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.order.create({
        data: {
          id: orderId,
          orderNo,
          status,
          subtotal,
          tax,
          total,
          note,
          items: {
            create: items.map((item) => ({
              productId: item.productId as string,
              productName: item.productName as string,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              lineTotal: Number(item.quantity) * Number(item.unitPrice),
            })),
          },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          subtotal: true,
          tax: true,
          total: true,
          note: true,
          createdAt: true,
        },
      }),
    ];

    if (status === "PAID") {
      for (const [productId, quantity] of itemTotalsByProduct) {
        const current = stockById.get(productId);
        if (!current) {
          continue;
        }

        const newStock = current.stock - quantity;
        operations.push(
          prisma.product.update({
            where: { id: productId },
            data: { stock: newStock },
          }),
        );

        operations.push(
          prisma.inventoryMovement.create({
            data: {
              productId,
              movementType: "SALE",
              quantityDelta: -quantity,
              previousStock: current.stock,
              newStock,
              referenceType: "ORDER",
              referenceId: orderId,
              note: `Checkout sale (${orderNo})`,
            },
          }),
        );
      }
    }

    const [result] = await prisma.$transaction(operations);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create order";
    console.error("Failed to create order", error);

    if (
      message.includes("Insufficient stock") ||
      message.includes("Product not found")
    ) {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Unable to create order" },
      { status: 500 },
    );
  }
}

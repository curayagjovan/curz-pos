import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateOrderBody = {
  status?: "PAID" | "CANCELLED";
  subtotal?: number;
  tax?: number;
  total?: number;
  note?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
};

function generateOrderNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `POS-${stamp}-${random}`;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
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
      { message: "Unable to load transactions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const status = body.status ?? "PAID";
    const subtotal = Number(body.subtotal ?? 0);
    const tax = Number(body.tax ?? 0);
    const total = Number(body.total ?? 0);
    const note = body.note?.trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (
      !["PAID", "CANCELLED"].includes(status) ||
      Number.isNaN(subtotal) ||
      Number.isNaN(tax) ||
      Number.isNaN(total) ||
      subtotal < 0 ||
      tax < 0 ||
      total < 0 ||
      items.length === 0
    ) {
      return NextResponse.json(
        { message: "Invalid transaction payload" },
        { status: 400 },
      );
    }

    for (const item of items) {
      if (
        !item.productId ||
        !item.productName ||
        Number(item.quantity) <= 0 ||
        Number(item.unitPrice) < 0
      ) {
        return NextResponse.json(
          { message: "Invalid transaction items" },
          { status: 400 },
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        status,
        subtotal,
        tax,
        total,
        note: note || null,
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
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Failed to create order", error);
    return NextResponse.json(
      { message: "Unable to save transaction" },
      { status: 500 },
    );
  }
}

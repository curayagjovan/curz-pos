import { NextResponse } from "next/server";
import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderItemInput = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  bundleQty?: number | null;
  bundlePrice?: number | null;
};

type OrderPayload = {
  status?: "PAID" | "REFUNDED" | "VOIDED";
  total?: number;
  amountPaid?: number;
  note?: string;
  items?: OrderItemInput[];
};

const orderItemSelect = {
  id: true,
  productName: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
} as const;

const orderListSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  note: true,
  createdAt: true,
  items: {
    select: orderItemSelect,
  },
} as const;

const orderListSelectWithAmountPaid = {
  ...orderListSelectBase,
  amountPaid: true,
} as const;

const orderCreateSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  note: true,
  createdAt: true,
} as const;

const orderCreateSelectWithAmountPaid = {
  ...orderCreateSelectBase,
  amountPaid: true,
} as const;

function isMissingAmountPaidColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    String(error.meta?.column ?? "").includes("Order.amountPaid")
  );
}

function withNullAmountPaid<T extends Record<string, unknown>>(order: T) {
  return {
    ...order,
    amountPaid: null,
  };
}

function createOrderNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${stamp}-${suffix}`;
}

function computeLineTotal(
  quantity: number,
  unitPrice: number,
  bundleQty: number | null,
  bundlePrice: number | null,
) {
  if (
    bundleQty !== null &&
    bundleQty >= 2 &&
    bundlePrice !== null &&
    bundlePrice >= 0
  ) {
    const bundles = Math.floor(quantity / bundleQty);
    const remainder = quantity % bundleQty;
    return Number((bundles * bundlePrice + remainder * unitPrice).toFixed(2));
  }

  return Number((quantity * unitPrice).toFixed(2));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const statusParam = url.searchParams.get("status");
    const hasPaginationParams =
      url.searchParams.has("page") ||
      url.searchParams.has("limit") ||
      url.searchParams.has("status");

    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit =
      Number.isNaN(limitParam) || limitParam < 1
        ? 10
        : Math.min(limitParam, 100);
    const skip = (page - 1) * limit;

    const status: OrderStatus | null =
      statusParam === "PAID" ||
      statusParam === "REFUNDED" ||
      statusParam === "VOIDED"
        ? (statusParam as OrderStatus)
        : null;

    const where: Prisma.OrderWhereInput | undefined = status
      ? { status }
      : undefined;

    if (!hasPaginationParams) {
      let orders: unknown[];
      try {
        orders = await prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
          select: orderListSelectWithAmountPaid,
        });
      } catch (error) {
        if (!isMissingAmountPaidColumnError(error)) {
          throw error;
        }

        const fallbackOrders = await prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
          select: orderListSelectBase,
        });
        orders = fallbackOrders.map(withNullAmountPaid);
      }

      return NextResponse.json(orders);
    }

    let orders: unknown[];
    let total: number;

    try {
      [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: orderListSelectWithAmountPaid,
        }),
        prisma.order.count({ where }),
      ]);
    } catch (error) {
      if (!isMissingAmountPaidColumnError(error)) {
        throw error;
      }

      const [fallbackOrders, fallbackTotal] = await prisma.$transaction([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: orderListSelectBase,
        }),
        prisma.order.count({ where }),
      ]);

      orders = fallbackOrders.map(withNullAmountPaid);
      total = fallbackTotal;
    }

    return NextResponse.json({
      items: orders,
      total,
      page,
      limit,
    });
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
    const requestedAmountPaid =
      body.amountPaid === undefined || body.amountPaid === null
        ? null
        : Number(body.amountPaid);
    const note = body.note?.trim() || null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (
      !["PAID", "REFUNDED", "VOIDED"].includes(status) ||
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

    const productIds = Array.from(
      new Set(items.map((item) => item.productId as string)),
    );
    const productSnapshot = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        bundleQty: true,
        bundlePrice: true,
      },
    });

    const productById = new Map(productSnapshot.map((p) => [p.id, p]));

    const orderItems = items.map((item) => {
      const productId = item.productId as string;
      const quantity = Number(item.quantity);
      const current = productById.get(productId);

      if (!current) {
        throw new Error("Product not found during checkout");
      }

      const unitPrice = Number(current.price);
      const bundlePrice =
        current.bundlePrice === null ? null : Number(current.bundlePrice);
      const lineTotal = computeLineTotal(
        quantity,
        unitPrice,
        current.bundleQty,
        bundlePrice,
      );

      return {
        productId,
        productName: item.productName as string,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const computedTotal = Number(
      orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );
    const amountPaid =
      status === "PAID"
        ? requestedAmountPaid === null
          ? computedTotal
          : Number(requestedAmountPaid.toFixed(2))
        : null;

    if (
      amountPaid !== null &&
      (!Number.isFinite(amountPaid) || amountPaid < computedTotal)
    ) {
      return NextResponse.json(
        { message: "Invalid amount paid" },
        { status: 400 },
      );
    }

    const orderId = crypto.randomUUID();
    const orderNo = createOrderNo();
    const createOrderOperation = (includeAmountPaid: boolean) =>
      prisma.order.create({
        data: {
          id: orderId,
          orderNo,
          status,
          total: computedTotal,
          ...(includeAmountPaid ? { amountPaid } : {}),
          note,
          items: {
            create: orderItems,
          },
        },
        select: includeAmountPaid
          ? orderCreateSelectWithAmountPaid
          : orderCreateSelectBase,
      });

    const createSideEffects = () => {
      return [] as Prisma.PrismaPromise<unknown>[];
    };

    let result: unknown;
    try {
      const operations: Prisma.PrismaPromise<unknown>[] = [
        createOrderOperation(true),
        ...createSideEffects(),
      ];
      [result] = await prisma.$transaction(operations);
    } catch (error) {
      if (!isMissingAmountPaidColumnError(error)) {
        throw error;
      }

      const fallbackOperations: Prisma.PrismaPromise<unknown>[] = [
        createOrderOperation(false),
        ...createSideEffects(),
      ];
      const [fallbackResult] = await prisma.$transaction(fallbackOperations);
      result = withNullAmountPaid(fallbackResult as Record<string, unknown>);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create order";
    console.error("Failed to create order", error);

    if (message.includes("Product not found")) {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Unable to create order" },
      { status: 500 },
    );
  }
}

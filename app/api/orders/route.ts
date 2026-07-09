import { NextResponse } from "next/server";
import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendCheckoutSuccessPush } from "@/lib/push-notifications";

type OrderItemInput = {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  bundleQty?: number | null;
  bundlePrice?: number | null;
};

type OrderPayload = {
  requestId?: string;
  status?: "PENDING" | "PAID" | "REFUNDED" | "VOIDED";
  total?: number;
  amountPaid?: number;
  note?: string;
  senderPushEndpoint?: string;
  items?: OrderItemInput[];
};

type OrderItemReturnInput = {
  id?: string;
  returnedQuantity?: number;
};

type OrderStatusUpdatePayload = {
  id?: string;
  status?: "PENDING" | "PAID" | "REFUNDED" | "VOIDED";
  items?: OrderItemReturnInput[];
};

const orderItemSelect = {
  id: true,
  productName: true,
  quantity: true,
  unitPrice: true,
  lineTotal: true,
  returnedQuantity: true,
} as const;

const orderListSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  refundAmount: true,
  refundedAt: true,
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
  amountPaid: true,
  refundAmount: true,
  refundedAt: true,
  note: true,
  createdAt: true,
  items: {
    select: orderItemSelect,
  },
} as const;

const orderCreateSelectWithAmountPaid = {
  ...orderCreateSelectBase,
} as const;

const duplicateGuardOrderSelectBase = {
  id: true,
  orderNo: true,
  status: true,
  total: true,
  note: true,
  createdAt: true,
  items: {
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
} as const;

const duplicateGuardOrderSelectWithAmountPaid = {
  ...duplicateGuardOrderSelectBase,
  amountPaid: true,
} as const;

const ACCIDENTAL_DUPLICATE_WINDOW_MS = 25_000;

function isMissingAmountPaidColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    String(error.meta?.column ?? "").includes("Order.amountPaid")
  );
}

function toMoneyNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function toOrderItemsSignature(
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>,
) {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice.toFixed(2)),
      lineTotal: Number(item.lineTotal.toFixed(2)),
    }))
    .sort((left, right) => {
      if (left.productId !== right.productId) {
        return left.productId.localeCompare(right.productId);
      }

      if (left.quantity !== right.quantity) {
        return left.quantity - right.quantity;
      }

      if (left.unitPrice !== right.unitPrice) {
        return left.unitPrice - right.unitPrice;
      }

      return left.lineTotal - right.lineTotal;
    })
    .map(
      (item) =>
        `${item.productId}:${item.quantity}:${item.unitPrice.toFixed(2)}:${item.lineTotal.toFixed(2)}`,
    )
    .join("|");
}

function withNullAmountPaid<T extends Record<string, unknown>>(order: T) {
  return {
    ...order,
    amountPaid: null,
  };
}

function isConnectionClosedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("postgresql connection") && message.includes("closed")
  );
}

function isAnyUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRetryableCreateOrderError(error: unknown) {
  if (isConnectionClosedError(error)) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1008", "P1017", "P2024", "P2028"].includes(
      error.code,
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("connection")
    );
  }

  return false;
}

function getUniqueConstraintTarget(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return [] as string[];
  }

  if (error.code !== "P2002") {
    return [] as string[];
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map((value) => String(value));
  }

  if (typeof target === "string") {
    return [target];
  }

  return [] as string[];
}

function isUniqueOrderIdOrNoError(error: unknown) {
  const target = getUniqueConstraintTarget(error);
  return target.some(
    (value) => value.includes("id") || value.includes("orderNo"),
  );
}

function isUniqueOrderNoError(error: unknown) {
  const target = getUniqueConstraintTarget(error);
  return target.some((value) => value.includes("orderNo"));
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
      statusParam === "PENDING" ||
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
    const normalizedRequestId =
      typeof body.requestId === "string" && body.requestId.trim().length > 0
        ? body.requestId.trim().slice(0, 64)
        : null;
    const senderPushEndpoint =
      typeof body.senderPushEndpoint === "string" &&
      body.senderPushEndpoint.trim().length > 0
        ? body.senderPushEndpoint.trim()
        : null;
    const status = body.status ?? "PAID";
    const requestedAmountPaid =
      body.amountPaid === undefined || body.amountPaid === null
        ? null
        : Number(body.amountPaid);
    const note = body.note?.trim() || null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (
      !["PENDING", "PAID", "REFUNDED", "VOIDED"].includes(status) ||
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

    const missingProductIds: string[] = [];
    const missingProductNames: string[] = [];

    const orderItems = items
      .map((item) => {
        const productId = item.productId as string;
        const quantity = Number(item.quantity);
        const current = productById.get(productId);

        if (!current) {
          missingProductIds.push(productId);
          missingProductNames.push(item.productName ?? "Unknown product");
          return null;
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
      })
      .filter(
        (
          item,
        ): item is {
          productId: string;
          productName: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
        } => item !== null,
      );

    if (missingProductIds.length > 0) {
      return NextResponse.json(
        {
          message:
            "Some cart items are no longer available. They were removed from your cart.",
          missingProductIds,
          missingProductNames,
        },
        { status: 409 },
      );
    }

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

    if (status === "PAID") {
      const cutoffDate = new Date(Date.now() - ACCIDENTAL_DUPLICATE_WINDOW_MS);
      const currentSignature = toOrderItemsSignature(orderItems);

      let recentOrders: Array<Record<string, unknown>>;
      try {
        recentOrders = (await prisma.order.findMany({
          where: {
            status: "PAID",
            createdAt: { gte: cutoffDate },
            total: computedTotal,
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: duplicateGuardOrderSelectWithAmountPaid,
        })) as Array<Record<string, unknown>>;
      } catch (error) {
        if (!isMissingAmountPaidColumnError(error)) {
          throw error;
        }

        const fallbackRecentOrders = await prisma.order.findMany({
          where: {
            status: "PAID",
            createdAt: { gte: cutoffDate },
            total: computedTotal,
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: duplicateGuardOrderSelectBase,
        });

        recentOrders = fallbackRecentOrders.map((order) =>
          withNullAmountPaid(order as Record<string, unknown>),
        );
      }

      const duplicateMatch = recentOrders.find((order) => {
        const total = toMoneyNumber(order.total);
        const paid = toMoneyNumber(order.amountPaid);
        const expectedPaid = toMoneyNumber(amountPaid ?? computedTotal);
        const notesMatch = (order.note ?? null) === note;
        const items = Array.isArray(order.items)
          ? (order.items as Array<Record<string, unknown>>)
          : [];

        const existingSignature = toOrderItemsSignature(
          items
            .map((item) => ({
              productId: String(item.productId ?? ""),
              quantity: Number(item.quantity ?? 0),
              unitPrice: toMoneyNumber(item.unitPrice),
              lineTotal: toMoneyNumber(item.lineTotal),
            }))
            .filter(
              (item) =>
                item.productId !== "" &&
                Number.isFinite(item.quantity) &&
                item.quantity > 0,
            ),
        );

        return (
          total === computedTotal &&
          paid === expectedPaid &&
          notesMatch &&
          existingSignature === currentSignature
        );
      });

      if (duplicateMatch) {
        return NextResponse.json(duplicateMatch, { status: 200 });
      }
    }

    const orderId = normalizedRequestId ?? crypto.randomUUID();
    let orderNo = createOrderNo();
    if (normalizedRequestId) {
      const existingByRequestId = await prisma.order.findUnique({
        where: { id: orderId },
        select: orderCreateSelectWithAmountPaid,
      });

      if (existingByRequestId) {
        return NextResponse.json(existingByRequestId, { status: 200 });
      }
    }

    const createOrderOperation = (
      includeAmountPaid: boolean,
      orderIdentifier: { id: string; orderNo: string },
    ) =>
      prisma.order.create({
        data: {
          id: orderIdentifier.id,
          orderNo: orderIdentifier.orderNo,
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

    const runCreateOrder = async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const orderIdentifier = { id: orderId, orderNo };

        try {
          const operations: Prisma.PrismaPromise<unknown>[] = [
            createOrderOperation(true, orderIdentifier),
            ...createSideEffects(),
          ];
          const [result] = await prisma.$transaction(operations);
          return result;
        } catch (error) {
          if (isMissingAmountPaidColumnError(error)) {
            try {
              const fallbackOperations: Prisma.PrismaPromise<unknown>[] = [
                createOrderOperation(false, orderIdentifier),
                ...createSideEffects(),
              ];
              const [fallbackResult] =
                await prisma.$transaction(fallbackOperations);
              return withNullAmountPaid(
                fallbackResult as Record<string, unknown>,
              );
            } catch (fallbackError) {
              if (isUniqueOrderNoError(fallbackError) && attempt < 3) {
                orderNo = createOrderNo();
                continue;
              }
              throw fallbackError;
            }
          }

          if (isUniqueOrderNoError(error) && attempt < 3) {
            orderNo = createOrderNo();
            continue;
          }

          throw error;
        }
      }

      throw new Error("Unable to allocate a unique order number");
    };

    const getExistingOrderByIdentifier = async () => {
      try {
        const existing = await prisma.order.findUnique({
          where: { id: orderId },
          select: orderCreateSelectWithAmountPaid,
        });
        return existing;
      } catch (error) {
        if (!isMissingAmountPaidColumnError(error)) {
          throw error;
        }

        const existingFallback = await prisma.order.findUnique({
          where: { id: orderId },
          select: orderCreateSelectBase,
        });

        return existingFallback
          ? withNullAmountPaid(existingFallback as Record<string, unknown>)
          : null;
      }
    };

    let result: unknown;
    let createdNewOrder = false;
    let lastError: unknown = null;

    for (let retryAttempt = 0; retryAttempt < 3; retryAttempt += 1) {
      try {
        result = await runCreateOrder();
        createdNewOrder = true;
        break;
      } catch (error) {
        lastError = error;

        if (
          isUniqueOrderIdOrNoError(error) ||
          isAnyUniqueConstraintError(error)
        ) {
          const existingOrder = await getExistingOrderByIdentifier();
          if (existingOrder) {
            result = existingOrder;
            createdNewOrder = false;
            break;
          }
        }

        if (!isRetryableCreateOrderError(error) || retryAttempt >= 2) {
          throw error;
        }
      }
    }

    if (result === undefined) {
      throw lastError ?? new Error("Unable to create order");
    }

    if (createdNewOrder && status === "PAID") {
      const change = Math.max(0, (amountPaid ?? computedTotal) - computedTotal);

      void sendCheckoutSuccessPush({
        orderNo,
        total: computedTotal,
        change,
        excludeEndpoint: senderPushEndpoint,
      }).catch((pushError) => {
        console.error("Failed to send checkout push notification", pushError);
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create order", error);

    return NextResponse.json(
      { message: "Unable to create order" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as OrderStatusUpdatePayload;
    const id = body.id?.trim();
    const status = body.status;
    const itemsInput = Array.isArray(body.items) ? body.items : [];

    if (
      !id ||
      !status ||
      !["PENDING", "PAID", "REFUNDED", "VOIDED"].includes(status)
    ) {
      return NextResponse.json(
        { message: "Invalid status update payload" },
        { status: 400 },
      );
    }

    if (status === "REFUNDED" && itemsInput.length > 0) {
      const order = await prisma.order.findUnique({
        where: { id },
        select: {
          items: { select: { id: true, quantity: true, unitPrice: true } },
        },
      });

      if (!order) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 },
        );
      }

      const orderItemById = new Map(order.items.map((item) => [item.id, item]));
      const returnedQuantityByItemId = new Map<string, number>();

      for (const entry of itemsInput) {
        const itemId = entry.id?.trim();
        const returnedQuantity = Number(entry.returnedQuantity);
        const orderItem = itemId ? orderItemById.get(itemId) : undefined;

        if (
          !orderItem ||
          !Number.isInteger(returnedQuantity) ||
          returnedQuantity < 0 ||
          returnedQuantity > orderItem.quantity
        ) {
          return NextResponse.json(
            { message: "Invalid return quantities" },
            { status: 400 },
          );
        }

        returnedQuantityByItemId.set(orderItem.id, returnedQuantity);
      }

      const refundAmount = Number(
        order.items
          .reduce((sum, item) => {
            const returnedQuantity = returnedQuantityByItemId.get(item.id) ?? 0;
            return sum + returnedQuantity * Number(item.unitPrice);
          }, 0)
          .toFixed(2),
      );

      const [refundedOrder] = await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status, refundAmount, refundedAt: new Date() },
          select: orderCreateSelectWithAmountPaid,
        }),
        ...Array.from(returnedQuantityByItemId.entries())
          .filter(([, returnedQuantity]) => returnedQuantity > 0)
          .map(([itemId, returnedQuantity]) =>
            prisma.orderItem.update({
              where: { id: itemId },
              data: { returnedQuantity },
            }),
          ),
      ]);

      return NextResponse.json(refundedOrder, { status: 200 });
    }

    let updatedOrder: unknown;

    try {
      updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
        select: orderCreateSelectWithAmountPaid,
      });
    } catch (error) {
      if (isMissingAmountPaidColumnError(error)) {
        const fallback = await prisma.order.update({
          where: { id },
          data: { status },
          select: orderCreateSelectBase,
        });
        updatedOrder = withNullAmountPaid(fallback as Record<string, unknown>);
      } else if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return NextResponse.json(
          { message: "Order not found" },
          { status: 404 },
        );
      } else {
        throw error;
      }
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error("Failed to update order status", error);
    return NextResponse.json(
      { message: "Unable to update sale status" },
      { status: 500 },
    );
  }
}

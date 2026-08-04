import { NextResponse, after } from "next/server";
import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendCheckoutSuccessPush } from "@/lib/push-notifications";
import { requirePermission, requireUser } from "@/lib/auth/require-user";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import type {
  OrderPayload,
  OrderStatusUpdatePayload,
} from "@/lib/orders/types";
import {
  orderCreateSelectBase,
  orderCreateSelectWithAmountPaid,
  orderListSelectBase,
  orderListSelectWithAmountPaid,
} from "@/lib/orders/select";
import {
  createOrderNo,
  isMissingAmountPaidColumnError,
  withNullAmountPaid,
} from "@/lib/orders/helpers";
import { computeLineTotal } from "@/lib/bundle-pricing";
import { findAccidentalDuplicateOrder } from "@/lib/orders/duplicate-guard";
import { createOrderWithRetry } from "@/lib/orders/create-with-retry";
import { processOrderRefund } from "@/lib/orders/refund";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const statusParam = url.searchParams.get("status");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const customerIdParam = url.searchParams.get("customerId")?.trim() || null;
    // "none" is a reserved sentinel (not a real cuid) meaning "orders with
    // no customer at all" — used by the Utang page to surface pending sales
    // that still need to be attributed to someone.
    const unassignedOnly = customerIdParam === "none";
    const customerId = unassignedOnly ? null : customerIdParam;
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

    const fromDate = fromParam ? new Date(fromParam) : null;
    const toDate = toParam ? new Date(toParam) : null;
    const hasValidFrom = fromDate !== null && !Number.isNaN(fromDate.getTime());
    const hasValidTo = toDate !== null && !Number.isNaN(toDate.getTime());

    const where: Prisma.OrderWhereInput | undefined =
      status || hasValidFrom || hasValidTo || customerId || unassignedOnly
        ? {
            ...(status ? { status } : {}),
            ...(customerId ? { customerId } : {}),
            ...(unassignedOnly ? { customerId: null } : {}),
            ...(hasValidFrom || hasValidTo
              ? {
                  createdAt: {
                    ...(hasValidFrom ? { gte: fromDate as Date } : {}),
                    ...(hasValidTo ? { lte: toDate as Date } : {}),
                  },
                }
              : {}),
          }
        : undefined;

    // A date range (or a single customer's history, or the unassigned-orders
    // lookup) is inherently bounded (a week of real-world sales volume, one
    // customer's utang history, or the store's outstanding unattributed
    // pending sales, never approaches this), so it always returns every
    // matching order rather than being capped like the latest-100
    // "recent activity" fetch below — callers navigating to older periods,
    // a customer's older unpaid orders, or hunting for a misattributed sale,
    // need the real data, not a sample of it.
    if (hasValidFrom || hasValidTo || customerId || unassignedOnly) {
      let orders: unknown[];
      try {
        orders = await prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 2000,
          select: orderListSelectWithAmountPaid,
        });
      } catch (error) {
        if (!isMissingAmountPaidColumnError(error)) {
          throw error;
        }

        const fallbackOrders = await prisma.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 2000,
          select: orderListSelectBase,
        });
        orders = fallbackOrders.map(withNullAmountPaid);
      }

      return NextResponse.json(orders);
    }

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
  const auth = await requireUser();
  if (!auth.ok) {
    return auth.response;
  }

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
    const customerId =
      typeof body.customerId === "string" && body.customerId.trim().length > 0
        ? body.customerId.trim()
        : null;
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

    // Utang tracking only works if an unpaid sale is attributed to someone —
    // an anonymous PENDING order can't be collected on later.
    if (status === "PENDING" && !customerId) {
      return NextResponse.json(
        { message: "A customer is required for unpaid sales" },
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

    const orderId = normalizedRequestId ?? crypto.randomUUID();
    const orderNo = createOrderNo();

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

    const productIds = Array.from(
      new Set(items.map((item) => item.productId as string)),
    );

    // Run the idempotency lookup and customer validation concurrently with
    // the product snapshot fetch instead of after it — none of them depend
    // on each other, and each round trip to the database costs real latency.
    const [productSnapshot, existingByRequestId, customerRecord] =
      await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            price: true,
            bundleTiers: { select: { quantity: true, price: true } },
            allowCustomPrice: true,
          },
        }),
        normalizedRequestId
          ? getExistingOrderByIdentifier()
          : Promise.resolve(null),
        customerId
          ? prisma.customer.findUnique({
              where: { id: customerId },
              select: { id: true, name: true, isActive: true },
            })
          : Promise.resolve(null),
      ]);

    if (existingByRequestId) {
      return NextResponse.json(existingByRequestId, { status: 200 });
    }

    if (customerId && (!customerRecord || !customerRecord.isActive)) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 400 },
      );
    }

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

        const unitPrice = current.allowCustomPrice
          ? Number(item.unitPrice)
          : Number(current.price);
        const lineTotal = computeLineTotal(
          quantity,
          unitPrice,
          current.bundleTiers.map((tier) => ({
            quantity: tier.quantity,
            price: Number(tier.price),
          })),
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
        // The item is taken before payment is settled in full, so a
        // PENDING order tracks whatever was actually collected (often
        // nothing) rather than requiring the full total up front.
        : status === "PENDING"
          ? Number((requestedAmountPaid ?? 0).toFixed(2))
          : null;

    if (
      status === "PAID" &&
      amountPaid !== null &&
      (!Number.isFinite(amountPaid) || amountPaid < computedTotal)
    ) {
      return NextResponse.json(
        { message: "Invalid amount paid" },
        { status: 400 },
      );
    }

    if (
      status === "PENDING" &&
      (!Number.isFinite(amountPaid as number) ||
        (amountPaid as number) < 0 ||
        (amountPaid as number) > computedTotal)
    ) {
      return NextResponse.json(
        { message: "Invalid amount paid" },
        { status: 400 },
      );
    }

    if (status === "PAID") {
      const duplicateMatch = await findAccidentalDuplicateOrder({
        computedTotal,
        amountPaid,
        note,
        orderItems,
      });

      if (duplicateMatch) {
        return NextResponse.json(duplicateMatch, { status: 200 });
      }
    }

    const { result, createdNewOrder } = await createOrderWithRetry({
      orderId,
      initialOrderNo: orderNo,
      status,
      computedTotal,
      amountPaid,
      note,
      customerId,
      customerName: customerRecord?.name ?? null,
      actor: auth.appUser,
      orderItems,
      getExistingOrderByIdentifier,
    });

    if (createdNewOrder && status === "PAID") {
      const change = Math.max(0, (amountPaid ?? computedTotal) - computedTotal);

      // after() keeps the serverless function alive until the sends finish;
      // a fire-and-forget promise gets frozen with the function as soon as
      // the response returns, silently dropping notifications.
      after(async () => {
        try {
          await sendCheckoutSuccessPush({
            orderNo: (result as { orderNo?: string })?.orderNo ?? orderNo,
            total: computedTotal,
            change,
            excludeEndpoint: senderPushEndpoint,
          });
        } catch (pushError) {
          console.error("Failed to send checkout push notification", pushError);
        }
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

    // An explicit amountPaid (from the Sales page's Pay popover) overrides
    // the default full-settle-to-total behavior below — it lets a partial
    // or custom payment amount get recorded even when the order stays
    // PENDING, without every other status-change caller needing to pass it.
    const hasAmountPaidOverride =
      body.amountPaid !== undefined && body.amountPaid !== null;
    if (
      hasAmountPaidOverride &&
      (!Number.isFinite(Number(body.amountPaid)) || Number(body.amountPaid) < 0)
    ) {
      return NextResponse.json(
        { message: "Invalid amount paid" },
        { status: 400 },
      );
    }
    const requestedAmountPaid = hasAmountPaidOverride
      ? Number(Number(body.amountPaid).toFixed(2))
      : null;

    // customerId is tri-state: absent (key not sent at all) means "leave it
    // alone" — the common case for every other status-change caller. Present
    // with null means unlink (a misattributed sale, e.g. from the Utang
    // page). Present with a string means assign/reassign (e.g. from the
    // Sales page attaching a customer to a pending sale that never had one,
    // or fixing one that had the wrong person).
    const customerIdProvided = Object.prototype.hasOwnProperty.call(
      body,
      "customerId",
    );

    if (
      customerIdProvided &&
      body.customerId !== null &&
      (typeof body.customerId !== "string" || body.customerId.trim().length === 0)
    ) {
      return NextResponse.json(
        { message: "Invalid customer" },
        { status: 400 },
      );
    }

    // Voiding/refunding is an Owner-only action; settling a pending sale to
    // paid (or back) is fine for any authenticated cashier.
    const auth =
      status === "REFUNDED" || status === "VOIDED"
        ? await requirePermission("VOID_REFUND")
        : await requireUser();
    if (!auth.ok) {
      return auth.response;
    }

    // Resolved once auth has passed — a non-null customerId must reference
    // a real, active customer before it's allowed onto the order.
    let nextCustomerId: string | null | undefined;
    let assignedCustomerName: string | null = null;
    if (customerIdProvided) {
      if (body.customerId === null) {
        nextCustomerId = null;
      } else {
        const customerId = (body.customerId as string).trim();
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: { id: true, name: true, isActive: true },
        });

        if (!customer || !customer.isActive) {
          return NextResponse.json(
            { message: "Customer not found" },
            { status: 400 },
          );
        }

        nextCustomerId = customerId;
        assignedCustomerName = customer.name;
      }
    }

    if (status === "REFUNDED" && itemsInput.length > 0) {
      const refundResult = await processOrderRefund({
        orderId: id,
        itemsInput,
        actor: auth.appUser,
      });

      if (!refundResult.ok) {
        return NextResponse.json(
          { message: refundResult.message },
          { status: refundResult.status },
        );
      }

      return NextResponse.json(refundResult.order, { status: 200 });
    }

    let updatedOrder: unknown;

    try {
      // Collecting payment on a PENDING sale (item already taken, balance
      // still outstanding) settles it to PAID — backfill amountPaid to the
      // full total here so the sale no longer shows an outstanding balance,
      // without requiring every caller of this generic status PATCH to pass
      // the amount explicitly. Skipped entirely when the caller already
      // provided an explicit amountPaid (a partial or custom payment).
      const existingOrder =
        status === "PAID" && requestedAmountPaid === null
          ? await prisma.order.findUnique({
              where: { id },
              select: { status: true, total: true },
            })
          : null;

      const shouldSettleFullPayment =
        existingOrder !== null && existingOrder.status !== "PAID";

      const amountPaidToPersist =
        requestedAmountPaid !== null
          ? requestedAmountPaid
          : shouldSettleFullPayment
            ? existingOrder!.total
            : null;

      updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          ...(amountPaidToPersist !== null
            ? { amountPaid: amountPaidToPersist }
            : {}),
          ...(nextCustomerId !== undefined ? { customerId: nextCustomerId } : {}),
        },
        select: orderCreateSelectWithAmountPaid,
      });
    } catch (error) {
      if (isMissingAmountPaidColumnError(error)) {
        const fallback = await prisma.order.update({
          where: { id },
          data: {
            status,
            ...(nextCustomerId !== undefined
              ? { customerId: nextCustomerId }
              : {}),
          },
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

    const updatedOrderNo =
      (updatedOrder as { orderNo?: string } | null)?.orderNo ?? id;

    const customerAuditSummary =
      nextCustomerId === null
        ? `Removed sale ${updatedOrderNo} from its customer (misattributed)`
        : nextCustomerId !== undefined
          ? `Assigned sale ${updatedOrderNo} to ${assignedCustomerName ?? "a customer"}`
          : null;

    await recordAudit(
      status === "VOIDED"
        ? {
            actor: auth.appUser,
            action: AUDIT_ACTIONS.ORDER_VOID,
            entityType: "Order",
            entityId: id,
            summary: `Voided sale ${updatedOrderNo}`,
          }
        : customerAuditSummary
          ? {
              actor: auth.appUser,
              action: AUDIT_ACTIONS.ORDER_STATUS_CHANGE,
              entityType: "Order",
              entityId: id,
              summary: customerAuditSummary,
            }
          : {
              actor: auth.appUser,
              action: AUDIT_ACTIONS.ORDER_STATUS_CHANGE,
              entityType: "Order",
              entityId: id,
              summary: `Changed sale ${updatedOrderNo} status to ${status}`,
            },
    );

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error("Failed to update order status", error);
    return NextResponse.json(
      { message: "Unable to update sale status" },
      { status: 500 },
    );
  }
}

import type { AppUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, auditLogCreateArgs } from "@/lib/audit";
import { orderCreateSelectWithAmountPaid } from "@/lib/orders/select";
import type { OrderItemReturnInput } from "@/lib/orders/types";

export type ProcessOrderRefundResult =
  | { ok: true; order: unknown }
  | { ok: false; status: number; message: string };

// Applies a partial-or-full return against a REFUNDED order: validates the
// requested return quantities against each item's original quantity, sums up
// the refund amount, and persists the order status, refund total, and each
// item's returnedQuantity in one transaction alongside the audit entry.
export async function processOrderRefund(params: {
  orderId: string;
  itemsInput: OrderItemReturnInput[];
  actor: Pick<AppUser, "id" | "email">;
}): Promise<ProcessOrderRefundResult> {
  const { orderId, itemsInput, actor } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNo: true,
      items: { select: { id: true, quantity: true, unitPrice: true } },
    },
  });

  if (!order) {
    return { ok: false, status: 404, message: "Order not found" };
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
      return { ok: false, status: 400, message: "Invalid return quantities" };
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
      where: { id: orderId },
      data: { status: "REFUNDED", refundAmount, refundedAt: new Date() },
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
    prisma.auditLog.create(
      auditLogCreateArgs({
        actor,
        action: AUDIT_ACTIONS.ORDER_REFUND,
        entityType: "Order",
        entityId: orderId,
        summary: `Refunded sale ${order.orderNo} for ₱${refundAmount.toFixed(2)}`,
      }),
    ),
  ]);

  return { ok: true, order: refundedOrder };
}

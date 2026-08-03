import { prisma } from "@/lib/prisma";
import {
  duplicateGuardOrderSelectBase,
  duplicateGuardOrderSelectWithAmountPaid,
} from "@/lib/orders/select";
import {
  ACCIDENTAL_DUPLICATE_WINDOW_MS,
  isMissingAmountPaidColumnError,
  toMoneyNumber,
  toOrderItemsSignature,
  withNullAmountPaid,
} from "@/lib/orders/helpers";

type OrderItemForSignature = {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

// Guards against the same sale getting recorded twice (e.g. a double-tapped
// checkout button firing two requests) by matching total, amount paid, note,
// and the exact set of line items against anything PAID in the last
// ACCIDENTAL_DUPLICATE_WINDOW_MS. Returns the existing order if a match is
// found so the caller can return it instead of creating a new one.
export async function findAccidentalDuplicateOrder(params: {
  computedTotal: number;
  amountPaid: number | null;
  note: string | null;
  orderItems: OrderItemForSignature[];
}): Promise<Record<string, unknown> | null> {
  const { computedTotal, amountPaid, note, orderItems } = params;
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

  return (
    recentOrders.find((order) => {
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
    }) ?? null
  );
}

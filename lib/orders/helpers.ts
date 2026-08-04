import { Prisma } from "@prisma/client";

export function isMissingAmountPaidColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    String(error.meta?.column ?? "").includes("Order.amountPaid")
  );
}

export function toMoneyNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

export function toOrderItemsSignature(
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

export function withNullAmountPaid<T extends Record<string, unknown>>(
  order: T,
) {
  return {
    ...order,
    amountPaid: null,
  };
}

export function isConnectionClosedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("postgresql connection") && message.includes("closed")
  );
}

export function isAnyUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function isRetryableCreateOrderError(error: unknown) {
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

export function getUniqueConstraintTarget(error: unknown) {
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

export function isUniqueOrderIdOrNoError(error: unknown) {
  const target = getUniqueConstraintTarget(error);
  return target.some(
    (value) => value.includes("id") || value.includes("orderNo"),
  );
}

export function isUniqueOrderNoError(error: unknown) {
  const target = getUniqueConstraintTarget(error);
  return target.some((value) => value.includes("orderNo"));
}

export function createOrderNo() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${stamp}-${suffix}`;
}

export const ACCIDENTAL_DUPLICATE_WINDOW_MS = 25_000;

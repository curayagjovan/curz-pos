import type { AppUser, OrderStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, auditLogCreateArgs } from "@/lib/audit";
import {
  orderCreateSelectBase,
  orderCreateSelectWithAmountPaid,
} from "@/lib/orders/select";
import {
  createOrderNo,
  isAnyUniqueConstraintError,
  isMissingAmountPaidColumnError,
  isRetryableCreateOrderError,
  isUniqueOrderIdOrNoError,
  isUniqueOrderNoError,
  withNullAmountPaid,
} from "@/lib/orders/helpers";

type OrderItemToCreate = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type CreateOrderWithRetryParams = {
  orderId: string;
  initialOrderNo: string;
  status: OrderStatus;
  computedTotal: number;
  amountPaid: number | null;
  note: string | null;
  customerId: string | null;
  customerName: string | null;
  actor: AppUser;
  orderItems: OrderItemToCreate[];
  getExistingOrderByIdentifier: () => Promise<Record<string, unknown> | null>;
};

// Creates the order + its audit log entry atomically, retrying with a fresh
// order number on orderNo collisions and again on transient connection
// errors. If a retry ultimately loses a race to another request that created
// the same order first, it returns that existing order instead of failing.
export async function createOrderWithRetry(
  params: CreateOrderWithRetryParams,
): Promise<{ result: unknown; createdNewOrder: boolean }> {
  const {
    orderId,
    status,
    computedTotal,
    amountPaid,
    note,
    customerId,
    customerName,
    actor,
    orderItems,
    getExistingOrderByIdentifier,
  } = params;

  let orderNo = params.initialOrderNo;

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
        customerId,
        items: {
          create: orderItems,
        },
      },
      select: includeAmountPaid
        ? orderCreateSelectWithAmountPaid
        : orderCreateSelectBase,
    });

  const createSideEffects = (orderIdentifier: {
    id: string;
    orderNo: string;
  }) => {
    return [
      prisma.auditLog.create(
        auditLogCreateArgs({
          actor,
          action: AUDIT_ACTIONS.ORDER_CREATE,
          entityType: "Order",
          entityId: orderIdentifier.id,
          summary: customerName
            ? `Created sale ${orderIdentifier.orderNo} (${status}) for ₱${computedTotal.toFixed(2)} — utang for ${customerName}`
            : `Created sale ${orderIdentifier.orderNo} (${status}) for ₱${computedTotal.toFixed(2)}`,
        }),
      ),
    ] as Prisma.PrismaPromise<unknown>[];
  };

  const runCreateOrder = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const orderIdentifier = { id: orderId, orderNo };

      try {
        const operations: Prisma.PrismaPromise<unknown>[] = [
          createOrderOperation(true, orderIdentifier),
          ...createSideEffects(orderIdentifier),
        ];
        const [result] = await prisma.$transaction(operations);
        return result;
      } catch (error) {
        if (isMissingAmountPaidColumnError(error)) {
          try {
            const fallbackOperations: Prisma.PrismaPromise<unknown>[] = [
              createOrderOperation(false, orderIdentifier),
              ...createSideEffects(orderIdentifier),
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

      if (isUniqueOrderIdOrNoError(error) || isAnyUniqueConstraintError(error)) {
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

  return { result, createdNewOrder };
}

import type { AppUser, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  ORDER_CREATE: "order.create",
  ORDER_STATUS_CHANGE: "order.status_change",
  ORDER_REFUND: "order.refund",
  ORDER_VOID: "order.void",
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",
  STAFF_CREATE: "staff.create",
  STAFF_UPDATE: "staff.update",
  SETTINGS_UPDATE: "settings.update",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditChanges = Record<string, { before: unknown; after: unknown }>;

type RecordAuditParams = {
  actor: Pick<AppUser, "id" | "email"> | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  changes?: AuditChanges;
};

function toAuditLogData(params: RecordAuditParams): Prisma.AuditLogCreateInput {
  return {
    actorId: params.actor?.id ?? null,
    actorEmail: params.actor?.email ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    summary: params.summary,
    changes: params.changes ? (params.changes as Prisma.InputJsonValue) : undefined,
  };
}

// Fire-and-record: a failed audit write must never break the mutation it's
// describing, so this swallows its own errors (logging them) instead of
// throwing back into the caller.
export async function recordAudit(params: RecordAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: toAuditLogData(params) });
  } catch (error) {
    console.error("Failed to record audit log entry", error);
  }
}

// For use inside an existing prisma.$transaction([...]) array so the audit
// row commits atomically with the mutation it's describing.
export function auditLogCreateArgs(
  params: RecordAuditParams,
): Prisma.AuditLogCreateArgs {
  return { data: toAuditLogData(params) };
}

export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): AuditChanges {
  const changes: AuditChanges = {};

  for (const key of Object.keys(after) as Array<keyof T & string>) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[key] = { before: beforeValue, after: afterValue };
    }
  }

  return changes;
}

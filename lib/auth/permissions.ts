import type { AppPermission, AppUser } from "@prisma/client";

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  VOID_REFUND: "Void & Refund Orders",
  MANAGE_PRODUCTS: "Manage Products",
  MANAGE_LOAD_ITEMS: "Manage Load Items",
  MANAGE_SETTINGS: "Manage Settings",
  MANAGE_STAFF: "Manage Staff",
  VIEW_AUDIT_LOG: "View Audit Trail",
};

export const ALL_PERMISSIONS = Object.keys(
  PERMISSION_LABELS,
) as AppPermission[];

// Owner always has every permission, regardless of what's stored — the
// permissions array only ever matters for a Cashier account.
export function hasPermission(
  appUser: Pick<AppUser, "role" | "permissions"> | null | undefined,
  permission: AppPermission,
): boolean {
  if (!appUser) return false;
  return appUser.role === "OWNER" || appUser.permissions.includes(permission);
}

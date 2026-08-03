import type { AppPermission } from "@prisma/client";

export type StaffMember = {
  id: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "CASHIER";
  isActive: boolean;
  permissions: AppPermission[];
};

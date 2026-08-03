import { useEffect, useState } from "react";
import type { AppPermission } from "@prisma/client";
import type { StaffMember } from "@/types/staff";

// Owns the staff list plus all three flows on this page — inviting a new
// staff member, editing an existing one's role/permissions, and the
// confirm-before-deactivate step (deactivating cuts access immediately, so
// it gets the same confirmation rigor as deleting a product).
export function useStaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [role, setRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [editPermissions, setEditPermissions] = useState<AppPermission[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(
    null,
  );
  const [deactivating, setDeactivating] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/staff", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load staff");
      }
      setStaff(data as StaffMember[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadStaff();
    };
    void run();
  }, []);

  const handleAdd = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setEmailError("A valid email is required");
      return;
    }
    setEmailError(null);

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role, sendInvite }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to add staff member");
      }
      setEmail("");
      setRole("CASHIER");
      setSendInvite(true);
      setAddOpen(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember): Promise<boolean> => {
    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, isActive: !member.isActive }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Unable to update staff member");
      }
      await loadStaff();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update staff member",
      );
      return false;
    }
  };

  // Reactivating isn't destructive (no confirmation needed), but turning a
  // staff member off cuts their access immediately — worth a confirmation
  // step, same rigor as deleting a product (see DeleteProductDialog).
  const handleSwitchActive = (member: StaffMember) => {
    if (member.isActive) {
      setDeactivateTarget(member);
    } else {
      void handleToggleActive(member);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    const succeeded = await handleToggleActive(deactivateTarget);
    setDeactivating(false);
    if (succeeded) {
      setDeactivateTarget(null);
    }
  };

  const activeOwnerCount = staff.filter(
    (member) => member.role === "OWNER" && member.isActive,
  ).length;

  const handleOpenEdit = (member: StaffMember) => {
    setEditTarget(member);
    setEditDisplayName(member.displayName ?? "");
    setEditRole(member.role);
    setEditPermissions(member.permissions ?? []);
    setEditError(null);
  };

  const handleTogglePermission = (permission: AppPermission) => {
    setEditPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  const isSoleActiveOwner =
    editTarget?.role === "OWNER" && activeOwnerCount <= 1;

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          role: editRole,
          displayName: editDisplayName.trim(),
          // Owner already has full access unconditionally, so the stored
          // permission set is only meaningful (and only touched) for Cashiers.
          ...(editRole === "CASHIER" ? { permissions: editPermissions } : {}),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update staff member");
      }
      setEditTarget(null);
      await loadStaff();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Unable to update staff member",
      );
    } finally {
      setEditSaving(false);
    }
  };

  return {
    staff,
    loading,
    error,
    addOpen,
    setAddOpen,
    email,
    setEmail,
    emailError,
    setEmailError,
    role,
    setRole,
    sendInvite,
    setSendInvite,
    saving,
    handleAdd,
    handleSwitchActive,
    editTarget,
    setEditTarget,
    editDisplayName,
    setEditDisplayName,
    editRole,
    setEditRole,
    editPermissions,
    editSaving,
    editError,
    handleOpenEdit,
    handleTogglePermission,
    handleSaveEdit,
    isSoleActiveOwner,
    deactivateTarget,
    setDeactivateTarget,
    deactivating,
    handleConfirmDeactivate,
  };
}

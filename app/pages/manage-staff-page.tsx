"use client";

import { useEffect, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/auth/permissions";
import type { AppPermission } from "@prisma/client";

type StaffMember = {
  id: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "CASHIER";
  isActive: boolean;
  permissions: AppPermission[];
};

export default function ManageStaffPage() {
  const { setCurrentPage } = usePageContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<"OWNER" | "CASHIER">("CASHIER");
  const [editPermissions, setEditPermissions] = useState<AppPermission[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role, sendInvite }),
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

  const handleToggleActive = async (member: StaffMember) => {
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update staff member",
      );
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

  return (
    <MobilePageWrapper
      title="Manage Staff"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1 }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading staff...
            </Typography>
          ) : (
            <List sx={{ px: 0 }}>
              {staff.map((member) => (
                <ListItem
                  key={member.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        onClick={() => handleOpenEdit(member)}
                        aria-label={`edit ${member.email}`}
                      >
                        <EditRounded fontSize="small" />
                      </IconButton>
                      <Switch
                        checked={member.isActive}
                        onChange={() => void handleToggleActive(member)}
                        disabled={member.role === "OWNER"}
                      />
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1">
                          {member.displayName || member.email}
                        </Typography>
                        <Chip
                          size="small"
                          label={member.role === "OWNER" ? "Owner" : "Cashier"}
                          color={member.role === "OWNER" ? "primary" : "default"}
                        />
                      </Stack>
                    }
                    secondary={member.email}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Button
            variant="outlined"
            startIcon={<AddRounded fontSize="small" />}
            onClick={() => setAddOpen(true)}
          >
            Add Staff
          </Button>
        </Stack>
      </Container>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Staff</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "OWNER" | "CASHIER")
              }
              fullWidth
            >
              <MenuItem value="CASHIER">Cashier</MenuItem>
              <MenuItem value="OWNER">Owner</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={sendInvite}
                  onChange={(event) => setSendInvite(event.target.checked)}
                />
              }
              label="Email an invite (skip if they'll sign in with Google)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={saving || !email.trim()}
          >
            {saving ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit Staff</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {editError ? <Alert severity="error">{editError}</Alert> : null}

            <Typography variant="body2" color="text.secondary">
              {editTarget?.email}
            </Typography>

            <TextField
              label="Display name"
              value={editDisplayName}
              onChange={(event) => setEditDisplayName(event.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Role"
              value={editRole}
              onChange={(event) =>
                setEditRole(event.target.value as "OWNER" | "CASHIER")
              }
              disabled={isSoleActiveOwner}
              helperText={
                isSoleActiveOwner
                  ? "At least one Owner is required"
                  : undefined
              }
              fullWidth
            >
              <MenuItem value="CASHIER">Cashier</MenuItem>
              <MenuItem value="OWNER">Owner</MenuItem>
            </TextField>

            <Divider />

            <Typography variant="subtitle2">Permissions</Typography>
            <Typography variant="body2" color="text.secondary">
              {editRole === "OWNER"
                ? "Owner always has full access."
                : "Grant this Cashier extra access beyond the basics."}
            </Typography>

            <Stack spacing={0.5}>
              {ALL_PERMISSIONS.map((permission) => (
                <FormControlLabel
                  key={permission}
                  control={
                    <Switch
                      checked={
                        editRole === "OWNER" ||
                        editPermissions.includes(permission)
                      }
                      disabled={editRole === "OWNER"}
                      onChange={() => handleTogglePermission(permission)}
                    />
                  }
                  label={PERMISSION_LABELS[permission]}
                />
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={editSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveEdit()}
            disabled={editSaving}
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </MobilePageWrapper>
  );
}

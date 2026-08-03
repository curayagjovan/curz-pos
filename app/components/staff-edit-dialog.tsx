"use client";

import type { AppPermission } from "@prisma/client";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/auth/permissions";
import type { StaffMember } from "@/types/staff";

type StaffEditDialogProps = {
  target: StaffMember | null;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  role: "OWNER" | "CASHIER";
  onRoleChange: (role: "OWNER" | "CASHIER") => void;
  permissions: AppPermission[];
  onTogglePermission: (permission: AppPermission) => void;
  isSoleActiveOwner: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
};

export default function StaffEditDialog({
  target,
  displayName,
  onDisplayNameChange,
  role,
  onRoleChange,
  permissions,
  onTogglePermission,
  isSoleActiveOwner,
  saving,
  error,
  onClose,
  onSubmit,
}: StaffEditDialogProps) {
  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit Staff</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Typography variant="body2" color="text.secondary">
            {target?.email}
          </Typography>

          <TextField
            label="Display name"
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            fullWidth
            autoFocus
          />

          <TextField
            select
            label="Role"
            value={role}
            onChange={(event) =>
              onRoleChange(event.target.value as "OWNER" | "CASHIER")
            }
            disabled={isSoleActiveOwner}
            helperText={
              isSoleActiveOwner ? "At least one Owner is required" : undefined
            }
            fullWidth
          >
            <MenuItem value="CASHIER">Cashier</MenuItem>
            <MenuItem value="OWNER">Owner</MenuItem>
          </TextField>

          <Divider />

          <Typography variant="subtitle2">Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            {role === "OWNER"
              ? "Owner always has full access."
              : "Grant this Cashier extra access beyond the basics."}
          </Typography>

          <Stack spacing={0.5}>
            {ALL_PERMISSIONS.map((permission) => (
              <FormControlLabel
                key={permission}
                control={
                  <Switch
                    checked={role === "OWNER" || permissions.includes(permission)}
                    disabled={role === "OWNER"}
                    onChange={() => onTogglePermission(permission)}
                  />
                }
                label={PERMISSION_LABELS[permission]}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

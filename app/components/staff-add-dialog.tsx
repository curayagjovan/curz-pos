"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

type StaffAddDialogProps = {
  open: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  emailError: string | null;
  role: "OWNER" | "CASHIER";
  onRoleChange: (role: "OWNER" | "CASHIER") => void;
  sendInvite: boolean;
  onSendInviteChange: (value: boolean) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function StaffAddDialog({
  open,
  email,
  onEmailChange,
  emailError,
  role,
  onRoleChange,
  sendInvite,
  onSendInviteChange,
  saving,
  onClose,
  onSubmit,
}: StaffAddDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add Staff</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            error={Boolean(emailError)}
            helperText={emailError}
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
            fullWidth
          >
            <MenuItem value="CASHIER">Cashier</MenuItem>
            <MenuItem value="OWNER">Owner</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={sendInvite}
                onChange={(event) => onSendInviteChange(event.target.checked)}
              />
            }
            label="Email an invite (skip if they'll sign in with Google)"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

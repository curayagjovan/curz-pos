"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { StaffMember } from "@/types/staff";

type StaffDeactivateDialogProps = {
  target: StaffMember | null;
  deactivating: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function StaffDeactivateDialog({
  target,
  deactivating,
  onClose,
  onConfirm,
}: StaffDeactivateDialogProps) {
  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Deactivate Staff?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {target
            ? `Deactivate ${target.displayName || target.email}? They will lose access immediately.`
            : "Deactivate this staff member?"}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={deactivating}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={deactivating}
        >
          {deactivating ? "Deactivating..." : "Deactivate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

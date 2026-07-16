"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { LoadCatalogItem } from "@/lib/mobile-load-catalog";

type DeleteLoadItemDialogProps = {
  item: LoadCatalogItem | null;
  deletingItemId: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteLoadItemDialog({
  item,
  deletingItemId,
  onClose,
  onConfirm,
}: DeleteLoadItemDialogProps) {
  return (
    <Dialog open={Boolean(item)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Load?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {item
            ? `Delete ${item.label}? This removes it from the Load page.`
            : "Delete this load?"}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={Boolean(deletingItemId)}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={Boolean(deletingItemId)}
        >
          {deletingItemId ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

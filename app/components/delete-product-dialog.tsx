"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { Product } from "@/types/product";

type DeleteProductDialogProps = {
  product: Product | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteProductDialog({
  product,
  onClose,
  onConfirm,
}: DeleteProductDialogProps) {
  return (
    <Dialog open={Boolean(product)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Product?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {product
            ? `Delete ${product.name}? This removes it from inventory.`
            : "Delete this product?"}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

"use client";

import type { Dispatch, SetStateAction } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { CustomerFormState } from "@/app/hooks/use-customers-crud";

type CustomerFormDialogProps = {
  open: boolean;
  mode: "add" | "edit";
  form: CustomerFormState;
  setForm: Dispatch<SetStateAction<CustomerFormState>>;
  nameError: string | null;
  onNameErrorClear: () => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CustomerFormDialog({
  open,
  mode,
  form,
  setForm,
  nameError,
  onNameErrorClear,
  saving,
  onClose,
  onSubmit,
}: CustomerFormDialogProps) {
  const isAdd = mode === "add";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isAdd ? "Add Customer" : "Edit Customer"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }));
              onNameErrorClear();
            }}
            error={Boolean(nameError)}
            helperText={nameError}
            fullWidth
            autoFocus
          />
          <TextField
            label={isAdd ? "Phone (optional)" : "Phone"}
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            fullWidth
          />
          <TextField
            label={isAdd ? "Note (optional)" : "Note"}
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({ ...current, note: event.target.value }))
            }
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? (isAdd ? "Adding..." : "Saving...") : isAdd ? "Add" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

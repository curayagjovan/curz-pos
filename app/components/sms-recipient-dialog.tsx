"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { isValidSmsRecipient } from "@/lib/sms-link";

type SmsRecipientDialogProps = {
  open: boolean;
  number: string;
  onClose: () => void;
  onSave: (number: string) => Promise<void>;
};

export default function SmsRecipientDialog({
  open,
  number,
  onClose,
  onSave,
}: SmsRecipientDialogProps) {
  const [form, setForm] = useState(number);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prev, setPrev] = useState({ open, number });

  if (open !== prev.open || number !== prev.number) {
    setPrev({ open, number });
    if (open) {
      setForm(number);
      setSaveError(null);
    }
  }

  const isValid = form.trim().length === 0 || isValidSmsRecipient(form);

  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(form.trim());
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save recipient number",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Request Recipient</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            fullWidth
            label="Mobile or access number"
            value={form}
            placeholder="09XXXXXXXXX"
            onChange={(event) => setForm(event.target.value)}
            slotProps={{
              htmlInput: {
                inputMode: "tel",
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Load and e-wallet requests open your SMS app already addressed to
            this number with the message filled in.
          </Typography>

          {!isValid ? (
            <Typography variant="caption" color="error">
              Enter a valid mobile number or access number.
            </Typography>
          ) : null}

          {saveError ? (
            <Typography variant="caption" color="error">
              {saveError}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={!isValid || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

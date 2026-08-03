"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { EWalletFeeSettings } from "@/lib/ewallet-fee";
import { getFeeForAmount } from "@/lib/ewallet-fee";

type EWalletFeeDialogProps = {
  open: boolean;
  settings: EWalletFeeSettings;
  onClose: () => void;
  onSave: (settings: EWalletFeeSettings) => Promise<void>;
};

const BRACKET_FIELDS: Array<{
  field: keyof EWalletFeeSettings;
  label: string;
}> = [
  { field: "tier1Fee", label: "₱1 – ₱100" },
  { field: "tier2Fee", label: "₱101 – ₱500" },
  { field: "tier3Fee", label: "₱501 – ₱1,000" },
  { field: "tier4Fee", label: "₱1,001 – ₱1,500" },
];

export default function EWalletFeeDialog({
  open,
  settings,
  onClose,
  onSave,
}: EWalletFeeDialogProps) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prev, setPrev] = useState({ open, settings });

  if (open !== prev.open || settings !== prev.settings) {
    setPrev({ open, settings });
    if (open) {
      setForm(settings);
      setSaveError(null);
    }
  }

  const handleChange =
    (field: keyof EWalletFeeSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: Number(event.target.value),
      }));
    };

  const isValid = (
    ["tier1Fee", "tier2Fee", "tier3Fee", "tier4Fee", "stepFee"] as const
  ).every((field) => Number.isFinite(form[field]) && form[field] >= 0);

  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(form);
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save fee settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>E-Wallet Fee Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack spacing={1}>
            {BRACKET_FIELDS.map(({ field, label }, index) => (
              <Stack
                key={field}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {label}
                </Typography>
                <TextField
                  label="Fee ₱"
                  type="number"
                  size="small"
                  value={form[field]}
                  onChange={handleChange(field)}
                  autoFocus={index === 0}
                  sx={{ width: 110 }}
                />
              </Stack>
            ))}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ flex: 1 }}>
                Every ₱500 above ₱1,500
              </Typography>
              <TextField
                label="Adds ₱"
                type="number"
                size="small"
                value={form.stepFee}
                onChange={handleChange("stepFee")}
                sx={{ width: 110 }}
              />
            </Stack>
            {isValid ? (
              <Typography variant="caption" color="text.secondary">
                e.g. ₱1,501–2,000 → ₱{getFeeForAmount(2000, form)} · ₱2,001–2,500
                → ₱{getFeeForAmount(2500, form)} · ₱9,501–10,000 → ₱
                {getFeeForAmount(10000, form)}
              </Typography>
            ) : null}
          </Stack>

          {!isValid ? (
            <Typography variant="caption" color="error">
              Enter valid numbers — fees can&apos;t be negative.
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

"use client";

import { useEffect, useState } from "react";
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

type EWalletFeeDialogProps = {
  open: boolean;
  settings: EWalletFeeSettings;
  onClose: () => void;
  onSave: (settings: EWalletFeeSettings) => Promise<void>;
};

export default function EWalletFeeDialog({
  open,
  settings,
  onClose,
  onSave,
}: EWalletFeeDialogProps) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(settings);
      setSaveError(null);
    }
  }, [open, settings]);

  const handleChange =
    (field: keyof EWalletFeeSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: Number(event.target.value),
      }));
    };

  const isValid =
    Number.isFinite(form.tier1Max) &&
    Number.isFinite(form.tier2Max) &&
    Number.isFinite(form.tier1Fee) &&
    Number.isFinite(form.tier2Fee) &&
    Number.isFinite(form.tier3Fee) &&
    form.tier1Max > 0 &&
    form.tier2Max > form.tier1Max &&
    form.tier1Fee >= 0 &&
    form.tier2Fee >= 0 &&
    form.tier3Fee >= 0;

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
            <Typography variant="subtitle2">Tier 1</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Up to ₱"
                type="number"
                value={form.tier1Max}
                onChange={handleChange("tier1Max")}
                fullWidth
              />
              <TextField
                label="Fee ₱"
                type="number"
                value={form.tier1Fee}
                onChange={handleChange("tier1Fee")}
                fullWidth
              />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">Tier 2</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Up to ₱"
                type="number"
                value={form.tier2Max}
                onChange={handleChange("tier2Max")}
                fullWidth
              />
              <TextField
                label="Fee ₱"
                type="number"
                value={form.tier2Fee}
                onChange={handleChange("tier2Fee")}
                fullWidth
              />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Tier 3 (above ₱{Number.isFinite(form.tier2Max) ? form.tier2Max : 0})
            </Typography>
            <TextField
              label="Fee ₱"
              type="number"
              value={form.tier3Fee}
              onChange={handleChange("tier3Fee")}
              fullWidth
            />
          </Stack>

          {!isValid ? (
            <Typography variant="caption" color="error">
              Enter valid numbers — Tier 2 &ldquo;up to&rdquo; amount must be
              greater than Tier 1, and fees can&apos;t be negative.
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

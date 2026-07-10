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
import type { LoadMarkupSettings } from "@/lib/load-markup";

type LoadMarkupDialogProps = {
  open: boolean;
  settings: LoadMarkupSettings;
  onClose: () => void;
  onSave: (settings: LoadMarkupSettings) => Promise<void>;
};

export default function LoadMarkupDialog({
  open,
  settings,
  onClose,
  onSave,
}: LoadMarkupDialogProps) {
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
    (field: keyof LoadMarkupSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: Number(event.target.value),
      }));
    };

  const isValid =
    Number.isFinite(form.tier1Max) &&
    Number.isFinite(form.tier2Max) &&
    Number.isFinite(form.tier1Markup) &&
    Number.isFinite(form.tier2Markup) &&
    Number.isFinite(form.tier3Markup) &&
    form.tier1Max > 0 &&
    form.tier2Max > form.tier1Max &&
    form.tier1Markup >= 0 &&
    form.tier2Markup >= 0 &&
    form.tier3Markup >= 0;

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
        error instanceof Error ? error.message : "Unable to save markup settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Load Markup Settings</DialogTitle>
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
                label="Markup ₱"
                type="number"
                value={form.tier1Markup}
                onChange={handleChange("tier1Markup")}
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
                label="Markup ₱"
                type="number"
                value={form.tier2Markup}
                onChange={handleChange("tier2Markup")}
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
              label="Markup ₱"
              type="number"
              value={form.tier3Markup}
              onChange={handleChange("tier3Markup")}
              fullWidth
            />
          </Stack>

          {!isValid ? (
            <Typography variant="caption" color="error">
              Enter valid numbers — Tier 2 "up to" amount must be greater than
              Tier 1, and markups can't be negative.
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

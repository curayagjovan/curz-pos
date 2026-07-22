"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { LOAD_BRANDS, type LoadBrand, type LoadCategory } from "@/lib/mobile-load-catalog";

export type AddLoadItemFormState = {
  brand: LoadBrand | "";
  category: LoadCategory;
  code: string;
  amount: string;
  label: string;
  description: string;
};

export type AddLoadItemFormErrors = {
  brand?: string;
  code?: string;
  amount?: string;
  label?: string;
};

type AddLoadItemDrawerProps = {
  open: boolean;
  isEditing?: boolean;
  form: AddLoadItemFormState;
  formErrors: AddLoadItemFormErrors;
  saving: boolean;
  onClose: () => void;
  onFieldChange: <K extends keyof AddLoadItemFormState>(
    field: K,
    value: AddLoadItemFormState[K],
  ) => void;
  onSave: () => void;
};

export default function AddLoadItemDrawer({
  open,
  isEditing = false,
  form,
  formErrors,
  saving,
  onClose,
  onFieldChange,
  onSave,
}: AddLoadItemDrawerProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      slotProps={{
        paper: {
          sx: {
            pb: "env(safe-area-inset-bottom)",
            maxHeight: "88dvh",
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5, overflowY: "auto" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6">{isEditing ? "Edit Load" : "Add Load"}</Typography>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>

        <Stack
          spacing={1.6}
          sx={{
            "& .MuiInputBase-root": {
              minHeight: 56,
            },
            "& .MuiInputBase-input": {
              fontSize: "1rem",
            },
            "& .MuiFormHelperText-root": {
              mt: 0.75,
              fontSize: "0.8rem",
            },
          }}
        >
          <TextField
            select
            label="Network"
            value={form.brand}
            onChange={(event) =>
              onFieldChange("brand", event.target.value as LoadBrand)
            }
            size="medium"
            fullWidth
            required
            error={Boolean(formErrors.brand)}
            helperText={formErrors.brand}
          >
            {LOAD_BRANDS.map(({ brand, label }) => (
              <MenuItem key={brand} value={brand}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Load Type"
            value={form.category}
            onChange={(event) =>
              onFieldChange("category", event.target.value as LoadCategory)
            }
            size="medium"
            fullWidth
            required
          >
            <MenuItem value="Regular Load">Regular Load</MenuItem>
            <MenuItem value="Data Promo">Data Promo</MenuItem>
          </TextField>

          <TextField
            label="Label"
            value={form.label}
            onChange={(event) => onFieldChange("label", event.target.value)}
            size="medium"
            fullWidth
            required
            error={Boolean(formErrors.label)}
            helperText={formErrors.label || "Shown to the cashier, e.g. \"GoUNLI50\""}
          />

          <TextField
            label="Code"
            value={form.code}
            onChange={(event) => onFieldChange("code", event.target.value)}
            size="medium"
            fullWidth
            required
            error={Boolean(formErrors.code)}
            helperText={formErrors.code || "Keyword sent in the load request, e.g. \"GOUNLI50\""}
          />

          <TextField
            label="Amount"
            value={form.amount}
            onChange={(event) => onFieldChange("amount", event.target.value)}
            size="medium"
            fullWidth
            type="number"
            required
            error={Boolean(formErrors.amount)}
            helperText={formErrors.amount}
            slotProps={{
              htmlInput: {
                min: 0,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            size="medium"
            fullWidth
            multiline
            minRows={2}
            helperText="Optional, e.g. validity/inclusions"
          />
        </Stack>

        <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="inherit"
            fullWidth
            onClick={onClose}
            disabled={saving}
            size="large"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={onSave}
            disabled={saving}
            size="large"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Box>
    </SwipeableDrawer>
  );
}

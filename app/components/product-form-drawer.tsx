"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/product-categories";

export type ProductFormBundleTier = {
  quantity: string;
  price: string;
};

export type ProductFormState = {
  id: string | null;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: string;
  bundleTiers: ProductFormBundleTier[];
};

export type ProductFormErrors = {
  name?: string;
  sku?: string;
  price?: string;
};

type ProductFormDrawerProps = {
  open: boolean;
  form: ProductFormState;
  formErrors: ProductFormErrors;
  saving: boolean;
  onClose: () => void;
  onFieldChange: (field: keyof ProductFormState, value: string) => void;
  onTierChange: (
    index: number,
    field: keyof ProductFormBundleTier,
    value: string,
  ) => void;
  onAddTier: () => void;
  onRemoveTier: (index: number) => void;
  onSave: () => void;
};

export default function ProductFormDrawer({
  open,
  form,
  formErrors,
  saving,
  onClose,
  onFieldChange,
  onTierChange,
  onAddTier,
  onRemoveTier,
  onSave,
}: ProductFormDrawerProps) {
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
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6">
            {form.id ? "Edit Product" : "Add Product"}
          </Typography>
          <IconButton onClick={onClose} disabled={saving} aria-label="close">
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
          {form.id ? (
            <TextField
              label="SKU"
              value={form.sku}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
              helperText={formErrors.sku ? formErrors.sku : "SKU is read-only"}
              fullWidth
              error={Boolean(formErrors.sku)}
            />
          ) : null}
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            fullWidth
            required
            autoFocus
            error={Boolean(formErrors.name)}
            helperText={formErrors.name}
          />
          <TextField
            select
            label="Category"
            value={form.category}
            onChange={(event) => onFieldChange("category", event.target.value)}
            fullWidth
            required
          >
            {PRODUCT_CATEGORY_OPTIONS.map(({ value, label, Icon }) => (
              <MenuItem key={value} value={value}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Icon fontSize="small" color="action" />
                  <span>{label}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) =>
              onFieldChange("description", event.target.value)
            }
            fullWidth
            multiline
            minRows={2}
            helperText="Optional"
          />
          <TextField
            label="Price"
            value={form.price}
            onChange={(event) => onFieldChange("price", event.target.value)}
            fullWidth
            type="number"
            error={Boolean(formErrors.price)}
            helperText={formErrors.price}
            slotProps={{
              htmlInput: {
                min: 0,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
            required
          />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Bundles
            </Typography>
            <Stack spacing={1.25}>
              {form.bundleTiers.map((tier, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Qty"
                    value={tier.quantity}
                    onChange={(event) =>
                      onTierChange(index, "quantity", event.target.value)
                    }
                    type="number"
                    slotProps={{
                      htmlInput: { min: 2, step: "1", inputMode: "numeric" },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Price"
                    value={tier.price}
                    onChange={(event) =>
                      onTierChange(index, "price", event.target.value)
                    }
                    type="number"
                    slotProps={{
                      htmlInput: { min: 0, step: "0.01", inputMode: "decimal" },
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    onClick={() => onRemoveTier(index)}
                    aria-label="Remove bundle tier"
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                startIcon={<AddRounded fontSize="small" />}
                onClick={onAddTier}
                variant="outlined"
                color="inherit"
              >
                Add bundle tier
              </Button>
            </Stack>
          </Box>
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

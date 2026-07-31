"use client";

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

export type ProductFormState = {
  id: string | null;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: string;
  bundleQty: string;
  bundlePrice: string;
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
  onSave: () => void;
};

export default function ProductFormDrawer({
  open,
  form,
  formErrors,
  saving,
  onClose,
  onFieldChange,
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
          <TextField
            label="Bundle Qty"
            value={form.bundleQty}
            onChange={(event) =>
              onFieldChange("bundleQty", event.target.value)
            }
            fullWidth
            type="number"
            slotProps={{
              htmlInput: {
                min: 2,
                step: "1",
                inputMode: "numeric",
              },
            }}
            helperText="Optional, requires Bundle Price"
          />
          <TextField
            label="Bundle Price"
            value={form.bundlePrice}
            onChange={(event) =>
              onFieldChange("bundlePrice", event.target.value)
            }
            fullWidth
            type="number"
            slotProps={{
              htmlInput: {
                min: 0,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
            helperText="Optional, requires Bundle Qty"
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

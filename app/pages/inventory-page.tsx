"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import type { Product } from "@/types/product";

type ProductFormState = {
  id: string | null;
  sku: string;
  name: string;
  unit: string;
  description: string;
  price: string;
};

type ProductFormErrors = {
  name?: string;
  sku?: string;
  price?: string;
};

const EMPTY_FORM: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  unit: "",
  description: "",
  price: "0",
};

export default function InventoryPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/products?skip=0&limit=9999", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      const items: Product[] = Array.isArray(data) ? data : (data.items ?? []);

      setProducts(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadInitialProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/products?skip=0&limit=9999", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        const items: Product[] = Array.isArray(data)
          ? data
          : (data.items ?? []);

        if (active) {
          setProducts(items);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load inventory",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInitialProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = product.name.toLowerCase();
      const sku = product.sku.toLowerCase();
      return name.includes(query) || sku.includes(query);
    });
  }, [products, deferredSearchQuery]);

  const handleProductTap = useCallback((product: Product) => {
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit?.toString() ?? "",
      description: product.description?.toString() ?? "",
      price: Number(product.price).toFixed(2),
    });
    setFormErrors({});
    setDrawerOpen(true);
  }, []);

  const handleAddProductClick = useCallback(() => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    if (saving) {
      return;
    }

    setDrawerOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }, [saving]);

  const handleFieldChange = useCallback(
    (field: keyof ProductFormState, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

      setFormErrors((current) => {
        if (!current[field as keyof ProductFormErrors]) {
          return current;
        }

        return {
          ...current,
          [field]: undefined,
        };
      });
    },
    [],
  );

  const handleSaveProduct = useCallback(async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    const nextErrors: ProductFormErrors = {};

    if (!name) {
      nextErrors.name = "Product name is required";
    }

    if (!Number.isFinite(price) || price < 0) {
      nextErrors.price = "Enter a valid price";
    }

    if (form.id && !form.sku.trim()) {
      nextErrors.sku = "SKU is required when editing";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setSnackbarMessage("Please fix the highlighted fields");
      setSnackbarOpen(true);
      return;
    }

    setFormErrors({});

    setSaving(true);

    try {
      const payload = {
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        name,
        unit: form.unit.trim() || undefined,
        description: form.description.trim() || undefined,
        price,
        cost: 0,
        markupPercent: 0,
        bundleQty: null,
        bundleMarkdownPercent: null,
        bundlePrice: null,
      };

      const response = await fetch(
        form.id ? `/api/products/${form.id}` : "/api/products",
        {
          method: form.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save product");
      }

      await loadProducts();

      setSnackbarMessage(form.id ? "Product updated" : "Product created");
      setSnackbarOpen(true);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setSnackbarMessage(
        err instanceof Error ? err.message : "Unable to save product",
      );
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  }, [form, loadProducts]);

  return (
    <MobilePageWrapper title="Inventory">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <ProductsSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search inventory"
            ariaLabel="search inventory"
          />

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading inventory..."
              : `${filteredProducts.length.toLocaleString()} products`}
          </Box>

          <ProductsCatalog
            products={filteredProducts}
            loading={loading}
            error={error}
            onAddToCart={handleProductTap}
          />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="add product"
        onClick={handleAddProductClick}
        sx={{
          position: "fixed",
          right: "calc(env(safe-area-inset-right) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
          zIndex: 1201,
        }}
      >
        <AddRounded />
      </Fab>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            pb: "env(safe-area-inset-bottom)",
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">
              {form.id ? "Edit Product" : "Add Product"}
            </Typography>
            <IconButton onClick={handleCloseDrawer} disabled={saving}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>

          <Stack spacing={1.1}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) =>
                handleFieldChange("name", event.target.value)
              }
              size="medium"
              fullWidth
              required
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
            />
            <TextField
              label="SKU"
              value={form.sku}
              onChange={(event) => handleFieldChange("sku", event.target.value)}
              helperText={
                formErrors.sku
                  ? formErrors.sku
                  : form.id
                    ? "Required for editing"
                    : "Optional (auto-generate if blank)"
              }
              size="medium"
              fullWidth
              error={Boolean(formErrors.sku)}
            />
            <TextField
              label="Unit"
              value={form.unit}
              onChange={(event) =>
                handleFieldChange("unit", event.target.value)
              }
              size="medium"
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) =>
                handleFieldChange("description", event.target.value)
              }
              size="medium"
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Price"
              value={form.price}
              onChange={(event) =>
                handleFieldChange("price", event.target.value)
              }
              size="medium"
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
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              onClick={handleCloseDrawer}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveProduct}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1400}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </MobilePageWrapper>
  );
}

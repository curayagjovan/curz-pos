"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
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
  price: string;
  bundleQty: string;
  bundlePrice: string;
};

type ProductFormErrors = {
  name?: string;
  sku?: string;
  price?: string;
};

type SnackbarSeverity = "success" | "error";

const EMPTY_FORM: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  price: "0",
  bundleQty: "",
  bundlePrice: "",
};

function upsertProduct(products: Product[], nextProduct: Product) {
  const existingIndex = products.findIndex(
    (product) => product.id === nextProduct.id,
  );

  const nextProducts = [...products];

  if (existingIndex === -1) {
    nextProducts.push(nextProduct);
  } else {
    nextProducts[existingIndex] = nextProduct;
  }

  return nextProducts.sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function matchesSearch(product: Product, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return (
    product.name.toLowerCase().includes(normalizedQuery) ||
    product.sku.toLowerCase().includes(normalizedQuery)
  );
}

export default function InventoryPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<SnackbarSeverity>("success");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});

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
  }, [refreshToken]);

  useEffect(() => {
    const handlePullToRefresh = () => {
      setRefreshToken((current) => current + 1);
    };

    window.addEventListener("app:pull-to-refresh", handlePullToRefresh);
    return () => {
      window.removeEventListener("app:pull-to-refresh", handlePullToRefresh);
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
      price: Number(product.price).toFixed(2),
      bundleQty:
        product.bundleQty === null || product.bundleQty === undefined
          ? ""
          : String(product.bundleQty),
      bundlePrice:
        product.bundlePrice === null || product.bundlePrice === undefined
          ? ""
          : Number(product.bundlePrice).toFixed(2),
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
    const bundleQty = form.bundleQty.trim() ? Number(form.bundleQty) : null;
    const bundlePrice = form.bundlePrice.trim()
      ? Number(form.bundlePrice)
      : null;
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
      setSnackbarSeverity("error");
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
        price,
        bundleQty,
        bundlePrice,
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

      const data = (await response.json()) as Product & { message?: string };
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save product");
      }

      setProducts((current) => upsertProduct(current, data));

      if (!matchesSearch(data, searchQuery)) {
        setSearchQuery("");
      }

      setSnackbarSeverity("success");
      setSnackbarMessage(form.id ? "Product updated" : "Product created");
      setSnackbarOpen(true);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setSnackbarSeverity("error");
      setSnackbarMessage(
        err instanceof Error ? err.message : "Unable to save product",
      );
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  }, [form, searchQuery, setSearchQuery]);

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
            variant="inventory"
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
          zIndex: (theme) => theme.zIndex.drawer - 1,
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
            <IconButton onClick={handleCloseDrawer} disabled={saving}>
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
                helperText={
                  formErrors.sku ? formErrors.sku : "SKU is read-only"
                }
                size="medium"
                fullWidth
                error={Boolean(formErrors.sku)}
              />
            ) : null}
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
            <TextField
              label="Bundle Qty"
              value={form.bundleQty}
              onChange={(event) =>
                handleFieldChange("bundleQty", event.target.value)
              }
              size="medium"
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
                handleFieldChange("bundlePrice", event.target.value)
              }
              size="medium"
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
              onClick={handleCloseDrawer}
              disabled={saving}
              size="large"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveProduct}
              disabled={saving}
              size="large"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2800}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </MobilePageWrapper>
  );
}

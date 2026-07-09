"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import AppSnackbar from "@/app/components/app-snackbar";
import DeleteProductDialog from "@/app/components/delete-product-dialog";
import ProductFormDrawer from "@/app/components/product-form-drawer";
import type {
  ProductFormErrors,
  ProductFormState,
} from "@/app/components/product-form-drawer";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useProducts } from "@/app/context/products-context";
import ProductsCatalog from "@/app/components/products-catalog";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import type { Product } from "@/types/product";

const EMPTY_FORM: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  description: "",
  price: "0",
  bundleQty: "",
  bundlePrice: "",
};

function matchesSearch(product: Product, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return (
    product.name.toLowerCase().includes(normalizedQuery) ||
    product.sku.toLowerCase().includes(normalizedQuery) ||
    Boolean(product.description?.toLowerCase().includes(normalizedQuery))
  );
}

export default function InventoryPage() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { products, loading, error, upsertProduct, removeProduct } =
    useProducts();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});

  const filteredProducts = useMemo(() => {
    if (!deferredSearchQuery.trim()) {
      return products;
    }

    return products.filter((product) =>
      matchesSearch(product, deferredSearchQuery),
    );
  }, [products, deferredSearchQuery]);

  const handleProductTap = useCallback((product: Product) => {
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
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

  const handleRequestDelete = useCallback((product: Product) => {
    setDeleteCandidate(product);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (deletingProductId) {
      return;
    }

    setDeleteCandidate(null);
  }, [deletingProductId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate) {
      return;
    }

    setDeletingProductId(deleteCandidate.id);

    try {
      const response = await fetch(`/api/products/${deleteCandidate.id}`, {
        method: "DELETE",
      });

      let message = "Unable to delete product";
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload?.message) {
          message = payload.message;
        }
      } catch {
        // Ignore response parse failures and keep fallback message.
      }

      if (!response.ok) {
        throw new Error(message);
      }

      removeProduct(deleteCandidate.id);

      if (form.id === deleteCandidate.id) {
        setDrawerOpen(false);
        setForm(EMPTY_FORM);
        setFormErrors({});
      }

      showSnackbar({ message: "Product deleted" });
      setDeleteCandidate(null);
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error ? err.message : "Unable to delete product",
        severity: "error",
      });
    } finally {
      setDeletingProductId(null);
    }
  }, [deleteCandidate, form.id, removeProduct, showSnackbar]);

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
      showSnackbar({
        message: "Please fix the highlighted fields",
        severity: "error",
      });
      return;
    }

    setFormErrors({});

    setSaving(true);

    try {
      const payload = {
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        name,
        description: form.description.trim() ? form.description.trim() : null,
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

      upsertProduct(data);

      if (!matchesSearch(data, searchQuery)) {
        setSearchQuery("");
      }

      showSnackbar({
        message: form.id ? "Product updated" : "Product created",
      });
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Unable to save product",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [form, searchQuery, setSearchQuery, showSnackbar, upsertProduct]);

  return (
    <MobilePageWrapper title="Inventory">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <ProductsSearchBar
            icon="search"
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
            onRequestDelete={handleRequestDelete}
            deletingProductId={deletingProductId}
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

      <ProductFormDrawer
        open={drawerOpen}
        form={form}
        formErrors={formErrors}
        saving={saving}
        onClose={handleCloseDrawer}
        onFieldChange={handleFieldChange}
        onSave={handleSaveProduct}
      />

      <DeleteProductDialog
        product={deleteCandidate}
        deletingProductId={deletingProductId}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
      />

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
      />
    </MobilePageWrapper>
  );
}

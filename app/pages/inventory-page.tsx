"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import AppSnackbar from "@/app/components/app-snackbar";
import CategoryFilterChips from "@/app/components/category-filter-chips";
import DeleteProductDialog from "@/app/components/delete-product-dialog";
import ProductFormDrawer from "@/app/components/product-form-drawer";
import type {
  ProductFormBundleTier,
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
import {
  DEFAULT_PRODUCT_CATEGORY,
  type ProductCategoryValue,
} from "@/lib/product-categories";

const EMPTY_FORM: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  category: DEFAULT_PRODUCT_CATEGORY,
  description: "",
  price: "0",
  bundleTiers: [],
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
  const { searchQuery, setSearchQuery, setCurrentPage } = usePageContext();
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
  const [categoryFilter, setCategoryFilter] =
    useState<ProductCategoryValue | null>(null);

  const categoryFilteredProducts = useMemo(() => {
    if (!categoryFilter) {
      return products;
    }

    return products.filter((product) => product.category === categoryFilter);
  }, [products, categoryFilter]);

  const filteredProducts = useMemo(() => {
    if (!deferredSearchQuery.trim()) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) =>
      matchesSearch(product, deferredSearchQuery),
    );
  }, [categoryFilteredProducts, deferredSearchQuery]);

  const handleProductTap = useCallback((product: Product) => {
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category ?? DEFAULT_PRODUCT_CATEGORY,
      description: product.description ?? "",
      price: Number(product.price).toFixed(2),
      bundleTiers: (product.bundleTiers ?? [])
        .slice()
        .sort((left, right) => left.quantity - right.quantity)
        .map((tier) => ({
          quantity: String(tier.quantity),
          price: Number(tier.price).toFixed(2),
        })),
    });
    setFormErrors({});
    setDrawerOpen(true);
  }, []);

  const handleTierChange = useCallback(
    (index: number, field: keyof ProductFormBundleTier, value: string) => {
      setForm((current) => ({
        ...current,
        bundleTiers: current.bundleTiers.map((tier, tierIndex) =>
          tierIndex === index ? { ...tier, [field]: value } : tier,
        ),
      }));
    },
    [],
  );

  const handleAddTier = useCallback(() => {
    setForm((current) => ({
      ...current,
      bundleTiers: [...current.bundleTiers, { quantity: "", price: "" }],
    }));
  }, []);

  const handleRemoveTier = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      bundleTiers: current.bundleTiers.filter(
        (_, tierIndex) => tierIndex !== index,
      ),
    }));
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
    // Drop fully-empty trailing rows a cashier added then reconsidered,
    // rather than forcing them to explicitly delete the row.
    const nonEmptyTiers = form.bundleTiers.filter(
      (tier) => tier.quantity.trim() !== "" || tier.price.trim() !== "",
    );
    const parsedTiers = nonEmptyTiers.map((tier) => ({
      quantity: Number(tier.quantity),
      price: Number(tier.price),
    }));
    const seenTierQuantities = new Set<number>();
    const hasInvalidTier = parsedTiers.some((tier) => {
      const isInvalid =
        !Number.isInteger(tier.quantity) ||
        tier.quantity < 2 ||
        !Number.isFinite(tier.price) ||
        tier.price < 0 ||
        seenTierQuantities.has(tier.quantity);
      seenTierQuantities.add(tier.quantity);
      return isInvalid;
    });
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

    if (Object.keys(nextErrors).length > 0 || hasInvalidTier) {
      setFormErrors(nextErrors);
      showSnackbar({
        message: hasInvalidTier
          ? "Each bundle tier needs a qty of 2+, a price of 0+, and a unique qty"
          : "Please fix the highlighted fields",
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
        category: form.category,
        description: form.description.trim() ? form.description.trim() : null,
        price,
        bundleTiers: parsedTiers,
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
    <MobilePageWrapper
      title="Inventory"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              pt: 0.5,
              pb: 1,
              bgcolor: "background.default",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ProductsSearchBar
                  icon="search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search inventory"
                  ariaLabel="search inventory"
                  sticky={false}
                />
              </Box>

              <CategoryFilterChips
                products={products}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </Stack>
          </Box>

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

          <Box sx={{ height: 64 }} aria-hidden />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="add product"
        onClick={handleAddProductClick}
        sx={{
          position: "fixed",
          right: "calc(env(safe-area-inset-right) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 16px)",
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
        onTierChange={handleTierChange}
        onAddTier={handleAddTier}
        onRemoveTier={handleRemoveTier}
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

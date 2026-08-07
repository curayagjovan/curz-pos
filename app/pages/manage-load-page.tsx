"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import SimCardRounded from "@mui/icons-material/SimCardRounded";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import AddLoadItemDrawer, {
  type AddLoadItemFormErrors,
  type AddLoadItemFormState,
} from "@/app/components/add-load-item-drawer";
import AppSnackbar from "@/app/components/app-snackbar";
import DeleteLoadItemDialog from "@/app/components/delete-load-item-dialog";
import FadeInContent from "@/app/components/fade-in-content";
import ListEmptyState from "@/app/components/list-empty-state";
import ListSkeleton from "@/app/components/list-skeleton";
import ManageLoadItemCard from "@/app/components/manage-load-item-card";
import ProductsSearchBar from "@/app/components/products-search-bar";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useLoadItems } from "@/app/context/load-items-context";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import {
  LOAD_BRANDS,
  type LoadBrand,
  type LoadCatalogItem,
} from "@/lib/mobile-load-catalog";

const EMPTY_FORM: AddLoadItemFormState = {
  brand: "",
  category: "Regular Load",
  code: "",
  amount: "",
  label: "",
  description: "",
};

function brandLabel(brand: LoadBrand) {
  return LOAD_BRANDS.find((entry) => entry.brand === brand)?.label ?? brand;
}

function matchesSearch(item: LoadCatalogItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return (
    item.label.toLowerCase().includes(normalizedQuery) ||
    item.code.toLowerCase().includes(normalizedQuery) ||
    brandLabel(item.brand).toLowerCase().includes(normalizedQuery) ||
    String(item.amount).includes(normalizedQuery)
  );
}

export default function ManageLoadPage() {
  const { searchQuery, setSearchQuery, setCurrentPage } = usePageContext();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { loadItems, loading, error, upsertLoadItem, removeLoadItem } =
    useLoadItems();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddLoadItemFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<AddLoadItemFormErrors>({});
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<LoadCatalogItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!deferredSearchQuery.trim()) {
      return loadItems;
    }

    return loadItems.filter((item) => matchesSearch(item, deferredSearchQuery));
  }, [loadItems, deferredSearchQuery]);

  const handleAddClick = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDrawerOpen(true);
  }, []);

  const handleEditClick = useCallback((item: LoadCatalogItem) => {
    setEditingId(item.id);
    setForm({
      brand: item.brand,
      category: item.category,
      code: item.code,
      amount: String(item.amount),
      label: item.label,
      description: item.description ?? "",
    });
    setFormErrors({});
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    if (saving) {
      return;
    }

    setDrawerOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }, [saving]);

  const handleFieldChange = useCallback(
    <K extends keyof AddLoadItemFormState>(
      field: K,
      value: AddLoadItemFormState[K],
    ) => {
      setForm((current) => ({ ...current, [field]: value }));
      setFormErrors((current) => {
        if (!current[field as keyof AddLoadItemFormErrors]) {
          return current;
        }
        return { ...current, [field]: undefined };
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const label = form.label.trim();
    const code = form.code.trim();
    const amount = Number(form.amount);
    const nextErrors: AddLoadItemFormErrors = {};

    if (!form.brand) {
      nextErrors.brand = "Select a network";
    }
    if (!label) {
      nextErrors.label = "Label is required";
    }
    if (!code) {
      nextErrors.code = "Code is required";
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Enter a valid amount";
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
      const response = await fetch(
        editingId ? `/api/load-items/${editingId}` : "/api/load-items",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: form.brand,
            category: form.category,
            code,
            amount,
            label,
            description: form.description.trim() || null,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.message ||
            (editingId
              ? "Unable to update load item"
              : "Unable to create load item"),
        );
      }

      upsertLoadItem({
        id: data.id,
        sku: data.sku,
        brand: data.brand,
        group: data.group,
        category:
          data.category === "DATA_PROMO" ? "Data Promo" : "Regular Load",
        code: data.code,
        amount: Number(data.amount),
        label: data.label,
        description: data.description ?? undefined,
      });

      showSnackbar({
        message: editingId ? "Load item updated" : "Load item created",
      });
      setDrawerOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error
            ? err.message
            : editingId
              ? "Unable to update load item"
              : "Unable to create load item",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [editingId, form, showSnackbar, upsertLoadItem]);

  const handleRequestDelete = useCallback((item: LoadCatalogItem) => {
    setDeleteCandidate(item);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (deletingItemId) {
      return;
    }
    setDeleteCandidate(null);
  }, [deletingItemId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate) {
      return;
    }

    setDeletingItemId(deleteCandidate.id);

    try {
      const response = await fetch(`/api/load-items/${deleteCandidate.id}`, {
        method: "DELETE",
      });

      let message = "Unable to delete load item";
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

      removeLoadItem(deleteCandidate.id);
      showSnackbar({ message: "Load item deleted" });
      setDeleteCandidate(null);
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error ? err.message : "Unable to delete load item",
        severity: "error",
      });
    } finally {
      setDeletingItemId(null);
    }
  }, [deleteCandidate, removeLoadItem, showSnackbar]);

  return (
    <MobilePageWrapper
      title="Manage Load"
      onBack={() => setCurrentPage("load")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <ProductsSearchBar
            icon="search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search loads"
            ariaLabel="search loads"
          />

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading loads..."
              : `${filteredItems.length.toLocaleString()} loads`}
          </Box>

          {loading ? (
            <ListSkeleton />
          ) : error ? (
            <ListEmptyState
              title="Unable to load"
              description={error}
              icon={<ErrorOutlineRounded fontSize="small" />}
            />
          ) : filteredItems.length === 0 ? (
            <ListEmptyState
              description="No loads found."
              icon={<SimCardRounded fontSize="small" />}
            />
          ) : (
            <FadeInContent>
              <List disablePadding>
                {filteredItems.map((item) => (
                  <ManageLoadItemCard
                    key={item.id}
                    item={item}
                    brandLabel={brandLabel(item.brand)}
                    onEdit={handleEditClick}
                    onRequestDelete={handleRequestDelete}
                    deleteDisabled={deletingItemId === item.id}
                  />
                ))}
              </List>
            </FadeInContent>
          )}

          <Box sx={{ height: 64 }} aria-hidden />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="add load"
        onClick={handleAddClick}
        sx={{
          position: "fixed",
          right: "calc(env(safe-area-inset-right) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 16px)",
          zIndex: (theme) => theme.zIndex.drawer - 1,
        }}
      >
        <AddRounded />
      </Fab>

      <AddLoadItemDrawer
        open={drawerOpen}
        isEditing={Boolean(editingId)}
        form={form}
        formErrors={formErrors}
        saving={saving}
        onClose={handleCloseDrawer}
        onFieldChange={handleFieldChange}
        onSave={() => void handleSave()}
      />

      <DeleteLoadItemDialog
        item={deleteCandidate}
        deletingItemId={deletingItemId}
        onClose={handleCloseDeleteDialog}
        onConfirm={() => void handleConfirmDelete()}
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

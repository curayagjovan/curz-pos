"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ListEmptyState from "@/app/components/list-empty-state";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import { useTransactions } from "@/app/context/transactions-context";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useTransactionsForCustomer } from "@/app/hooks/use-transactions-for-customer";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import AppSnackbar from "@/app/components/app-snackbar";
import type { Customer } from "@/types/customer";
import type { Transaction } from "@/types/transaction";

type CustomerFormState = {
  name: string;
  phone: string;
  note: string;
};

const EMPTY_FORM: CustomerFormState = { name: "", phone: "", note: "" };

export default function CustomersPage() {
  const { setCurrentPage } = usePageContext();
  const { updateTransactionStatus } = useTransactions();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load customers");
      }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadCustomers();
    };
    void run();
  }, [loadCustomers]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const {
    transactions: customerOrders,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchCustomerOrders,
  } = useTransactionsForCustomer(selectedCustomerId);

  const sortedCustomerOrders = useMemo(
    () =>
      [...customerOrders].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [customerOrders],
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? customers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(query) ||
            (customer.phone ?? "").toLowerCase().includes(query),
        )
      : customers;

    return [...list].sort((left, right) => {
      if (left.balance !== right.balance) {
        return right.balance - left.balance;
      }
      return left.name.localeCompare(right.name);
    });
  }, [customers, search]);

  const handleUpdateStatus = useCallback(
    async (
      id: string,
      status: Transaction["status"],
      items?: Array<{ id: string; returnedQuantity: number }>,
      amountPaid?: number,
    ) => {
      await updateTransactionStatus(id, status, items, amountPaid);
      await refetchCustomerOrders();
      await loadCustomers();
    },
    [updateTransactionStatus, refetchCustomerOrders, loadCustomers],
  );

  // Detaches a sale that was accidentally attributed to the wrong customer.
  // The sale itself (stock, items, total) is untouched — only the customer
  // link is cleared, so it drops off this customer's balance and history.
  const handleRemoveFromCustomer = useCallback(
    async (orderId: string) => {
      const order = customerOrders.find((item) => item.id === orderId);
      if (!order) {
        return;
      }

      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: order.status,
          customerId: null,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to remove this sale from the customer",
        );
      }

      await refetchCustomerOrders();
      await loadCustomers();
    },
    [customerOrders, refetchCustomerOrders, loadCustomers],
  );

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedCustomer) {
      return;
    }
    setForm({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone ?? "",
      note: selectedCustomer.note ?? "",
    });
    setEditOpen(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          note: form.note.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to add customer");
      }
      setAddOpen(false);
      await loadCustomers();
      showSnackbar({ message: `Added ${data.name}` });
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Unable to add customer",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          note: form.note.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update customer");
      }
      setEditOpen(false);
      await loadCustomers();
    } catch (err) {
      showSnackbar({
        message:
          err instanceof Error ? err.message : "Unable to update customer",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (selectedCustomer) {
    return (
      <MobilePageWrapper
        title={selectedCustomer.name}
        onBack={() => setSelectedCustomerId(null)}
        hideBottomNav
      >
        <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Stack spacing={0.25}>
                {selectedCustomer.phone ? (
                  <Typography variant="body2" color="text.secondary">
                    {selectedCustomer.phone}
                  </Typography>
                ) : null}
                {selectedCustomer.note ? (
                  <Typography variant="body2" color="text.secondary">
                    {selectedCustomer.note}
                  </Typography>
                ) : null}
              </Stack>
              <IconButton onClick={handleOpenEdit} aria-label="edit customer">
                <EditRounded fontSize="small" />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Outstanding Balance
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700 }}
                color={
                  selectedCustomer.balance > 0 ? "error.main" : "success.main"
                }
              >
                ₱{selectedCustomer.balance.toFixed(2)}
              </Typography>
            </Stack>

            <TransactionsCatalog
              transactions={sortedCustomerOrders}
              loading={ordersLoading}
              error={ordersError}
              onUpdateStatus={handleUpdateStatus}
              onRemoveFromCustomer={handleRemoveFromCustomer}
            />
          </Stack>
        </Container>

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                fullWidth
                autoFocus
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Note"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleEdit()}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        <AppSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          severity={snackbarSeverity}
          onClose={closeSnackbar}
        />
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper
      title="Utang"
      onBack={() => setCurrentPage("products")}
      hideBottomNav
    >
      <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            fullWidth
            size="small"
            label="Search customers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : filteredCustomers.length === 0 ? (
            <ListEmptyState description="No customers yet. Add one to start tracking utang." />
          ) : (
            <List sx={{ px: 0 }}>
              {filteredCustomers.map((customer) => (
                <ListItemButton
                  key={customer.id}
                  divider
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <ListItemText
                    primary={customer.name}
                    secondary={customer.phone ?? undefined}
                  />
                  <Chip
                    size="small"
                    label={`₱${customer.balance.toFixed(2)}`}
                    color={customer.balance > 0 ? "error" : "default"}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Button
            variant="outlined"
            startIcon={<AddRounded fontSize="small" />}
            onClick={handleOpenAdd}
          >
            Add Customer
          </Button>
        </Stack>
      </Container>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              fullWidth
              autoFocus
            />
            <TextField
              label="Phone (optional)"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Note (optional)"
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAdd()}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Adding..." : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={closeSnackbar}
      />
    </MobilePageWrapper>
  );
}

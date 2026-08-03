"use client";

import { useMemo, useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import AppSnackbar from "@/app/components/app-snackbar";
import CustomerDetailView from "@/app/components/customer-detail-view";
import CustomerFormDialog from "@/app/components/customer-form-dialog";
import ListEmptyState from "@/app/components/list-empty-state";
import { useTransactions } from "@/app/context/transactions-context";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useCustomerOrderActions } from "@/app/hooks/use-customer-order-actions";
import { useCustomersCrud } from "@/app/hooks/use-customers-crud";
import { useTransactionsForCustomer } from "@/app/hooks/use-transactions-for-customer";
import { useUnassignedPendingOrders } from "@/app/hooks/use-unassigned-pending-orders";
import { usePageContext } from "@/app/context/page-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { formatCurrency } from "@/lib/currency";

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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const {
    customers,
    loading,
    error,
    search,
    setSearch,
    filteredCustomers,
    loadCustomers,
    addOpen,
    setAddOpen,
    editOpen,
    setEditOpen,
    form,
    setForm,
    nameError,
    setNameError,
    saving,
    handleOpenAdd,
    handleOpenEdit,
    handleAdd,
    handleEdit,
  } = useCustomersCrud(showSnackbar);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const {
    transactions: customerOrders,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchCustomerOrders,
  } = useTransactionsForCustomer(selectedCustomerId);

  const {
    transactions: unassignedOrders,
    loading: unassignedLoading,
    error: unassignedError,
    refetch: refetchUnassignedOrders,
  } = useUnassignedPendingOrders();

  const sortedCustomerOrders = useMemo(
    () =>
      [...customerOrders].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [customerOrders],
  );

  const {
    handleUpdateStatus,
    handleRemoveFromCustomer,
    handleAssignUnassignedOrder,
    handleUpdateUnassignedOrderStatus,
  } = useCustomerOrderActions({
    selectedCustomer,
    customerOrders,
    updateTransactionStatus,
    refetchCustomerOrders,
    refetchUnassignedOrders,
    loadCustomers,
  });

  if (selectedCustomer) {
    return (
      <CustomerDetailView
        customer={selectedCustomer}
        onBack={() => setSelectedCustomerId(null)}
        sortedCustomerOrders={sortedCustomerOrders}
        ordersLoading={ordersLoading}
        ordersError={ordersError}
        unassignedOrders={unassignedOrders}
        unassignedLoading={unassignedLoading}
        unassignedError={unassignedError}
        onUpdateStatus={handleUpdateStatus}
        onRemoveFromCustomer={handleRemoveFromCustomer}
        onUpdateUnassignedOrderStatus={handleUpdateUnassignedOrderStatus}
        onAssignUnassignedOrder={handleAssignUnassignedOrder}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        form={form}
        setForm={setForm}
        nameError={nameError}
        setNameError={setNameError}
        saving={saving}
        onOpenEdit={() => handleOpenEdit(selectedCustomer)}
        onSubmitEdit={() => void handleEdit(selectedCustomer.id)}
        snackbarOpen={snackbarOpen}
        snackbarMessage={snackbarMessage}
        snackbarSeverity={snackbarSeverity}
        onCloseSnackbar={closeSnackbar}
      />
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
                    sx={{ minWidth: 0 }}
                  />
                  <Chip
                    size="small"
                    label={formatCurrency(customer.balance)}
                    color={customer.balance > 0 ? "error" : "default"}
                    sx={{ flexShrink: 0 }}
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

      <CustomerFormDialog
        open={addOpen}
        mode="add"
        form={form}
        setForm={setForm}
        nameError={nameError}
        onNameErrorClear={() => setNameError(null)}
        saving={saving}
        onClose={() => setAddOpen(false)}
        onSubmit={() => void handleAdd()}
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

"use client";

import type { Dispatch, SetStateAction } from "react";
import EditRounded from "@mui/icons-material/EditRounded";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppSnackbar from "@/app/components/app-snackbar";
import CustomerFormDialog from "@/app/components/customer-form-dialog";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import { formatCurrency } from "@/lib/currency";
import type { CustomerFormState } from "@/app/hooks/use-customers-crud";
import type { Customer } from "@/types/customer";
import type { Transaction } from "@/types/transaction";

type CustomerDetailViewProps = {
  customer: Customer;
  onBack: () => void;
  sortedCustomerOrders: Transaction[];
  ordersLoading: boolean;
  ordersError: string | null;
  unassignedOrders: Transaction[];
  unassignedLoading: boolean;
  unassignedError: string | null;
  onUpdateStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => Promise<void>;
  onRemoveFromCustomer: (orderId: string) => Promise<void>;
  onUpdateUnassignedOrderStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => Promise<void>;
  onAssignUnassignedOrder: (orderId: string) => Promise<void>;
  editOpen: boolean;
  setEditOpen: Dispatch<SetStateAction<boolean>>;
  form: CustomerFormState;
  setForm: Dispatch<SetStateAction<CustomerFormState>>;
  nameError: string | null;
  setNameError: Dispatch<SetStateAction<string | null>>;
  saving: boolean;
  onOpenEdit: () => void;
  onSubmitEdit: () => void;
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: "success" | "info" | "warning" | "error";
  onCloseSnackbar: () => void;
};

export default function CustomerDetailView({
  customer,
  onBack,
  sortedCustomerOrders,
  ordersLoading,
  ordersError,
  unassignedOrders,
  unassignedLoading,
  unassignedError,
  onUpdateStatus,
  onRemoveFromCustomer,
  onUpdateUnassignedOrderStatus,
  onAssignUnassignedOrder,
  editOpen,
  setEditOpen,
  form,
  setForm,
  nameError,
  setNameError,
  saving,
  onOpenEdit,
  onSubmitEdit,
  snackbarOpen,
  snackbarMessage,
  snackbarSeverity,
  onCloseSnackbar,
}: CustomerDetailViewProps) {
  return (
    <MobilePageWrapper title={customer.name} onBack={onBack} hideBottomNav>
      <Container maxWidth="sm" sx={{ py: 1, pb: 8 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Stack spacing={0.25}>
              {customer.phone ? (
                <Typography variant="body2" color="text.secondary">
                  {customer.phone}
                </Typography>
              ) : null}
              {customer.note ? (
                <Typography variant="body2" color="text.secondary">
                  {customer.note}
                </Typography>
              ) : null}
            </Stack>
            <IconButton onClick={onOpenEdit} aria-label="edit customer">
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
              color={customer.balance > 0 ? "error.main" : "success.main"}
            >
              {formatCurrency(customer.balance)}
            </Typography>
          </Stack>

          <TransactionsCatalog
            transactions={sortedCustomerOrders}
            loading={ordersLoading}
            error={ordersError}
            onUpdateStatus={onUpdateStatus}
            onRemoveFromCustomer={onRemoveFromCustomer}
            limitedActions
          />

          {unassignedOrders.length > 0 ? (
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" color="text.secondary">
                Unassigned Pending Sales
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pending sales with no customer yet — assign one here if it
                belongs to {customer.name}.
              </Typography>
              <TransactionsCatalog
                transactions={unassignedOrders}
                loading={unassignedLoading}
                error={unassignedError}
                onUpdateStatus={onUpdateUnassignedOrderStatus}
                onQuickAssignCustomer={onAssignUnassignedOrder}
                quickAssignLabel="Assign"
                limitedActions
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>

      <CustomerFormDialog
        open={editOpen}
        mode="edit"
        form={form}
        setForm={setForm}
        nameError={nameError}
        onNameErrorClear={() => setNameError(null)}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={onSubmitEdit}
      />

      <AppSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={onCloseSnackbar}
      />
    </MobilePageWrapper>
  );
}

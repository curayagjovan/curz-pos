import { useCallback } from "react";
import type { Customer } from "@/types/customer";
import type { Transaction } from "@/types/transaction";

type UseCustomerOrderActionsParams = {
  selectedCustomer: Customer | null;
  customerOrders: Transaction[];
  updateTransactionStatus: (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => Promise<void>;
  refetchCustomerOrders: () => Promise<void>;
  refetchUnassignedOrders: () => Promise<void>;
  loadCustomers: () => Promise<void>;
};

// Bundles every order-management action available from a customer's detail
// view — settling/voiding/refunding their sales, detaching a misattributed
// one, and assigning/updating orphaned pending sales onto them — since they
// all need to refresh the same handful of lists afterward.
export function useCustomerOrderActions({
  selectedCustomer,
  customerOrders,
  updateTransactionStatus,
  refetchCustomerOrders,
  refetchUnassignedOrders,
  loadCustomers,
}: UseCustomerOrderActionsParams) {
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

  // Attaches a pending sale that has no customer at all onto the one
  // currently being viewed — the other half of removeFromCustomer, for
  // picking a misattributed (or never-attributed) sale back up. Throws on
  // failure so the TransactionCard's own inline error display shows it.
  const handleAssignUnassignedOrder = useCallback(
    async (orderId: string) => {
      if (!selectedCustomer) {
        return;
      }

      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: "PENDING",
          customerId: selectedCustomer.id,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to assign this sale");
      }

      await Promise.all([
        refetchUnassignedOrders(),
        refetchCustomerOrders(),
        loadCustomers(),
      ]);
    },
    [selectedCustomer, refetchUnassignedOrders, refetchCustomerOrders, loadCustomers],
  );

  // These orphaned pending sales have no customer yet, so there's nothing
  // to reconcile against — status changes just need to refresh this list.
  const handleUpdateUnassignedOrderStatus = useCallback(
    async (
      id: string,
      status: Transaction["status"],
      items?: Array<{ id: string; returnedQuantity: number }>,
      amountPaid?: number,
    ) => {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, items, amountPaid }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update sale status");
      }

      await refetchUnassignedOrders();
    },
    [refetchUnassignedOrders],
  );

  return {
    handleUpdateStatus,
    handleRemoveFromCustomer,
    handleAssignUnassignedOrder,
    handleUpdateUnassignedOrderStatus,
  };
}

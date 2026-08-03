"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import AppSnackbar from "@/app/components/app-snackbar";
import FilterPopoverButton from "@/app/components/filter-popover-button";
import type { FilterPopoverOption } from "@/app/components/filter-popover-button";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import type { TransactionGroup } from "@/app/components/transactions-catalog";
import TransactionsTotalsBar from "@/app/components/transactions-totals-bar";
import WeekStripFilter from "@/app/components/week-strip-filter";
import { addDays, startOfDay, startOfWeek } from "@/lib/week-dates";
import { useCustomers } from "@/app/context/customers-context";
import { useTransactions } from "@/app/context/transactions-context";
import { useAppSnackbar } from "@/app/hooks/use-app-snackbar";
import { useSalesSummary } from "@/app/hooks/use-sales-summary";
import { useTransactionsInRange } from "@/app/hooks/use-transactions-in-range";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import type { Transaction } from "@/types/transaction";
import type { Customer } from "@/types/customer";

// Palette path strings (not hex) so these track the theme's info/success/
// warning tokens per color scheme — hardcoding the hex would freeze these
// at the light-mode values and look wrong in dark mode.
const STATUS_OPTIONS: FilterPopoverOption[] = [
  { key: "all", label: "All Status" },
  { key: "PENDING", label: "Pending", color: "info.main" },
  { key: "PAID", label: "Paid", color: "success.main" },
  { key: "REFUNDED", label: "Refunded", color: "warning.main" },
  { key: "VOIDED", label: "Voided" },
];

// Sales for the mini per-day figures, matching how the sales report counts
// sales: PAID/REFUNDED contribute their full total, and PENDING contributes
// only whatever has actually been collected against it so far (the balance
// still owed doesn't count as sales yet).
function transactionSalesAmount(transaction: Transaction) {
  if (transaction.status === "PAID" || transaction.status === "REFUNDED") {
    const amount = Number(transaction.total);
    return Number.isFinite(amount) ? amount : 0;
  }

  if (transaction.status === "PENDING") {
    const paid = Number(transaction.amountPaid ?? 0);
    return Number.isFinite(paid) ? paid : 0;
  }

  return 0;
}

export default function TransactionsPage() {
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTotals, setShowTotals] = useState(false);
  const {
    transactions: liveTransactions,
    loading: liveLoading,
    error: liveError,
    updateTransactionStatus,
  } = useTransactions();
  const { customers, createCustomer } = useCustomers();
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showSnackbar,
    closeSnackbar,
  } = useAppSnackbar();

  // The shared context only ever holds the latest ~100 orders (plus
  // whatever this specific device happened to cache before) — it silently
  // goes blank for older weeks once sales volume pushes them out of that
  // window. Fetching the visible week directly from the server guarantees
  // this page always shows the real data for whatever period is on screen.
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekStartIso = useMemo(() => weekStart.toISOString(), [weekStart]);
  const weekEndIso = useMemo(
    () => addDays(weekStart, 7).toISOString(),
    [weekStart],
  );
  const {
    transactions: rangeTransactions,
    loading: rangeLoading,
    error: rangeError,
    refetch: refetchRange,
  } = useTransactionsInRange(weekStartIso, weekEndIso);

  const selectedDateIso = useMemo(
    () => selectedDate.toISOString(),
    [selectedDate],
  );
  const {
    summary: salesSummary,
    loading: salesSummaryLoading,
    error: salesSummaryError,
    refetch: refetchSalesSummary,
  } = useSalesSummary(selectedDateIso);

  const transactions = useMemo(() => {
    // The range fetch wins on id conflicts — it's a targeted, always-fresh
    // (no-store) fetch for exactly this week, now kept live by its own
    // realtime/poll wiring, so it's authoritative for anything it returns.
    // The shared context only fills in whatever the range fetch is missing
    // (e.g. a same-session sale that hasn't round-tripped yet) — its local
    // cache can otherwise hold stale copies of orders that changed outside
    // this device's own update flow (another cashier's phone, a direct
    // database fix) indefinitely, since it only ever refreshes its "latest
    // ~100" window, not this specific date range.
    const merged = new Map(
      liveTransactions.map((transaction) => [transaction.id, transaction]),
    );
    for (const transaction of rangeTransactions) {
      merged.set(transaction.id, transaction);
    }
    return Array.from(merged.values());
  }, [rangeTransactions, liveTransactions]);

  const loading = liveLoading || rangeLoading;
  const error = rangeError ?? liveError;

  const handleUpdateStatus = async (
    id: string,
    status: Transaction["status"],
    items?: Array<{ id: string; returnedQuantity: number }>,
    amountPaid?: number,
  ) => {
    await updateTransactionStatus(id, status, items, amountPaid);
    // The order being updated may only exist in the range fetch (an older
    // order the shared context has never cached) — refetch so the change is
    // reflected regardless of which source originally supplied it.
    await refetchRange();
    // A refund/void shifts every period the order falls in (day, week,
    // month, and year all overlap it), so the report needs its own refetch
    // rather than being derived from the transactions already in memory.
    await refetchSalesSummary();
  };

  // Assigns (or reassigns) a pending sale to a customer directly from the
  // Sales page — covers sales that were never attributed to anyone, or that
  // need fixing after being detached via the Utang page's "Remove from
  // Customer" action.
  const handleAssignCustomer = async (id: string, customerId: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) {
      return;
    }

    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: transaction.status, customerId }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Unable to assign customer");
    }

    await refetchRange();
  };

  const handleCreateCustomer = async (input: {
    name: string;
    phone?: string;
  }): Promise<Customer | null> => {
    try {
      return await createCustomer(input);
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Unable to add customer",
        severity: "error",
      });
      return null;
    }
  };

  const filteredTransactions = useMemo(() => {
    const dayStartTime = selectedDate.getTime();
    const dayEndTime = addDays(selectedDate, 1).getTime();

    return transactions
      .filter((transaction) => {
        const transactionTime = new Date(transaction.createdAt).getTime();
        return (
          !Number.isNaN(transactionTime) &&
          transactionTime >= dayStartTime &&
          transactionTime < dayEndTime &&
          (statusFilter === "all" || transaction.status === statusFilter)
        );
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [transactions, selectedDate, statusFilter]);

  const dayTotals = useMemo(() => {
    const weekStartTime = weekStart.getTime();
    const weekEndTime = addDays(weekStart, 7).getTime();
    const totals = [0, 0, 0, 0, 0, 0, 0];

    for (const transaction of transactions) {
      const transactionTime = new Date(transaction.createdAt).getTime();
      if (
        Number.isNaN(transactionTime) ||
        transactionTime < weekStartTime ||
        transactionTime >= weekEndTime
      ) {
        continue;
      }

      const dayIndex = Math.floor(
        (transactionTime - weekStartTime) / (24 * 60 * 60 * 1000),
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        totals[dayIndex] += transactionSalesAmount(transaction);
      }
    }

    return totals;
  }, [transactions, weekStart]);

  const groupedTransactions = useMemo<TransactionGroup[] | undefined>(() => {
    if (filteredTransactions.length === 0) {
      return undefined;
    }

    const hourFormatter = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: true,
    });

    const groupsMap = new Map<string, TransactionGroup>();

    for (const transaction of filteredTransactions) {
      const createdAt = new Date(transaction.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        continue;
      }

      const hourStart = new Date(createdAt);
      hourStart.setMinutes(0, 0, 0);
      const groupKey = `hour-${hourStart.toISOString()}`;

      const existingGroup = groupsMap.get(groupKey);
      if (existingGroup) {
        existingGroup.transactions.push(transaction);
      } else {
        groupsMap.set(groupKey, {
          key: groupKey,
          label: hourFormatter.format(hourStart),
          transactions: [transaction],
        });
      }
    }

    return Array.from(groupsMap.values());
  }, [filteredTransactions]);

  return (
    <MobilePageWrapper title="Sales">
      <Container maxWidth="sm" sx={{ py: 0.5, pb: 8 }}>
        <Stack spacing={1.5}>
          <WeekStripFilter
            selectedDate={selectedDate}
            dayTotals={dayTotals}
            onSelectDate={setSelectedDate}
          />

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 0.5 }}
          >
            <Box sx={{ color: "text.secondary", typography: "caption" }}>
              {loading
                ? "Loading sales..."
                : `${filteredTransactions.length.toLocaleString()} sales`}
            </Box>
            <FilterPopoverButton
              ariaLabel="filter by status"
              options={STATUS_OPTIONS}
              selectedKeys={[statusFilter]}
              onSelect={setStatusFilter}
            />
          </Stack>

          <TransactionsCatalog
            transactions={filteredTransactions}
            loading={loading}
            error={error}
            onUpdateStatus={handleUpdateStatus}
            customers={customers}
            onAssignCustomer={handleAssignCustomer}
            onCreateCustomer={handleCreateCustomer}
            groups={groupedTransactions}
          />
        </Stack>
      </Container>

      <TransactionsTotalsBar
        expanded={showTotals}
        onToggle={() => setShowTotals((current) => !current)}
        referenceDate={selectedDate}
        summary={salesSummary}
        loading={salesSummaryLoading}
        error={salesSummaryError}
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

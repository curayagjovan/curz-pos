"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import type { TransactionGroup } from "@/app/components/transactions-catalog";
import TransactionsTotalsBar from "@/app/components/transactions-totals-bar";
import WeekStripFilter, {
  addDays,
  startOfDay,
  startOfWeek,
} from "@/app/components/week-strip-filter";
import { useTransactions } from "@/app/context/transactions-context";
import { useSalesSummary } from "@/app/hooks/use-sales-summary";
import { useTransactionsInRange } from "@/app/hooks/use-transactions-in-range";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";
import type { Transaction } from "@/types/transaction";

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
  const [showTotals, setShowTotals] = useState(false);
  const {
    transactions: liveTransactions,
    loading: liveLoading,
    error: liveError,
    updateTransactionStatus,
  } = useTransactions();

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
    // Context entries win on id conflicts — they're kept fresh by realtime
    // updates and local status-change edits, while the range fetch only
    // needs to fill in whatever the context doesn't have cached.
    const merged = new Map(
      rangeTransactions.map((transaction) => [transaction.id, transaction]),
    );
    for (const transaction of liveTransactions) {
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
  ) => {
    await updateTransactionStatus(id, status, items);
    // The order being updated may only exist in the range fetch (an older
    // order the shared context has never cached) — refetch so the change is
    // reflected regardless of which source originally supplied it.
    await refetchRange();
    // A refund/void shifts every period the order falls in (day, week,
    // month, and year all overlap it), so the report needs its own refetch
    // rather than being derived from the transactions already in memory.
    await refetchSalesSummary();
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
          transactionTime < dayEndTime
        );
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [transactions, selectedDate]);

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

          <Box sx={{ px: 0.5, color: "text.secondary", typography: "caption" }}>
            {loading
              ? "Loading sales..."
              : `${filteredTransactions.length.toLocaleString()} sales`}
          </Box>

          <TransactionsCatalog
            transactions={filteredTransactions}
            loading={loading}
            error={error}
            onUpdateStatus={handleUpdateStatus}
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
    </MobilePageWrapper>
  );
}

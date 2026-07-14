"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import type { TransactionGroup } from "@/app/components/transactions-catalog";
import TransactionsFilterBar from "@/app/components/transactions-filter-bar";
import type { ActiveFilter } from "@/app/components/transactions-filter-bar";
import TransactionsTotalsBar from "@/app/components/transactions-totals-bar";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getPeriodLabel(filter: ActiveFilter) {
  switch (filter) {
    case "today":
      return "Today";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "year":
      return "This Year";
    case "custom":
      return "Custom Range";
    default:
      return "All Time";
  }
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const dayOffset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - dayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfNextWeek(date: Date) {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 7);
  return start;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function TransactionsPage() {
  const [startDateTime, setStartDateTime] = useState(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return toDateTimeLocalValue(startOfToday);
  });
  const [endDateTime, setEndDateTime] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("today");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const { transactions, loading, error, updateTransactionStatus } =
    useTransactions();

  const filteredTransactions = useMemo(() => {
    const sortByNewest = (items: typeof transactions) =>
      [...items].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
          return 0;
        }

        if (Number.isNaN(leftTime)) {
          return 1;
        }

        if (Number.isNaN(rightTime)) {
          return -1;
        }

        return rightTime - leftTime;
      });

    if (!startDateTime && !endDateTime) {
      return sortByNewest(transactions);
    }

    const startTime = startDateTime ? new Date(startDateTime).getTime() : null;
    const presetUsesLiveEndTime =
      activeFilter === "today" ||
      activeFilter === "week" ||
      activeFilter === "month" ||
      activeFilter === "year";
    const endTime = presetUsesLiveEndTime
      ? null
      : endDateTime
        ? new Date(endDateTime).getTime()
        : null;

    if (
      (startTime !== null && Number.isNaN(startTime)) ||
      (endTime !== null && Number.isNaN(endTime))
    ) {
      return sortByNewest(transactions);
    }

    return sortByNewest(
      transactions.filter((transaction) => {
        const transactionTime = new Date(transaction.createdAt).getTime();

        if (Number.isNaN(transactionTime)) {
          return false;
        }

        return (
          (startTime === null || transactionTime >= startTime) &&
          (endTime === null || transactionTime <= endTime)
        );
      }),
    );
  }, [transactions, startDateTime, endDateTime, activeFilter]);

  const groupedTransactions = useMemo<TransactionGroup[] | undefined>(() => {
    if (
      activeFilter === null ||
      activeFilter === "custom" ||
      filteredTransactions.length === 0
    ) {
      return undefined;
    }

    const hourFormatter = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: true,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const monthFormatter = new Intl.DateTimeFormat("en-PH", {
      month: "long",
      year: "numeric",
    });

    const groupsMap = new Map<string, TransactionGroup>();

    for (const transaction of filteredTransactions) {
      const createdAt = new Date(transaction.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        continue;
      }

      let groupKey = "";
      let groupLabel = "";

      if (activeFilter === "today") {
        const hourStart = new Date(createdAt);
        hourStart.setMinutes(0, 0, 0);
        groupKey = `hour-${hourStart.toISOString()}`;
        groupLabel = hourFormatter.format(hourStart);
      }

      if (activeFilter === "week") {
        const dayStart = new Date(createdAt);
        dayStart.setHours(0, 0, 0, 0);
        groupKey = `day-${dayStart.toISOString()}`;
        groupLabel = dayFormatter.format(dayStart);
      }

      if (activeFilter === "month") {
        const weekStart = startOfWeek(createdAt);
        const nextWeekStart = startOfNextWeek(createdAt);
        groupKey = `week-${weekStart.toISOString()}`;
        groupLabel = `${formatShortDate(weekStart)} - ${formatShortDate(new Date(nextWeekStart.getTime() - 1))}`;
      }

      if (activeFilter === "year") {
        const monthStart = new Date(
          createdAt.getFullYear(),
          createdAt.getMonth(),
          1,
        );
        groupKey = `month-${monthStart.getFullYear()}-${monthStart.getMonth()}`;
        groupLabel = monthFormatter.format(monthStart);
      }

      const existingGroup = groupsMap.get(groupKey);
      if (existingGroup) {
        existingGroup.transactions.push(transaction);
      } else {
        groupsMap.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          transactions: [transaction],
        });
      }
    }

    return Array.from(groupsMap.values());
  }, [filteredTransactions, activeFilter]);

  const {
    filteredSalesTotal,
    filteredRefundedTotal,
    filteredVoidedTotal,
    filteredVoidedCount,
  } = useMemo(() => {
    return filteredTransactions.reduce(
      (totals, transaction) => {
        const amount = Number(transaction.total);
        if (!Number.isFinite(amount)) {
          return totals;
        }

        if (transaction.status === "PAID" || transaction.status === "REFUNDED") {
          totals.filteredSalesTotal += amount;
        }

        if (transaction.status === "REFUNDED") {
          const refundAmount = Number(transaction.refundAmount);
          totals.filteredRefundedTotal += Number.isFinite(refundAmount)
            ? refundAmount
            : 0;
        }

        if (transaction.status === "VOIDED") {
          totals.filteredVoidedTotal += amount;
          totals.filteredVoidedCount += 1;
        }

        return totals;
      },
      {
        filteredSalesTotal: 0,
        filteredRefundedTotal: 0,
        filteredVoidedTotal: 0,
        filteredVoidedCount: 0,
      },
    );
  }, [filteredTransactions]);

  const filteredNetSalesTotal = filteredSalesTotal - filteredRefundedTotal;
  const periodLabel = getPeriodLabel(activeFilter);

  const applyQuickRange = (
    filter: Exclude<ActiveFilter, "custom" | null>,
    start: Date,
    end: Date,
  ) => {
    setActiveFilter(filter);
    setShowCustomRange(true);
    setStartDateTime(toDateTimeLocalValue(start));
    setEndDateTime(toDateTimeLocalValue(end));
  };

  const handleSelectCustom = () => {
    setActiveFilter("custom");
    setShowCustomRange(true);
  };

  const handleStartDateTimeChange = (value: string) => {
    setActiveFilter("custom");
    setStartDateTime(value);
  };

  const handleEndDateTimeChange = (value: string) => {
    setActiveFilter("custom");
    setEndDateTime(value);
  };

  return (
    <MobilePageWrapper title="Sales">
      <Container maxWidth="sm" sx={{ py: 0.5, pb: showTotals ? 13 : 8 }}>
        <Stack spacing={1.5}>
          <TransactionsFilterBar
            activeFilter={activeFilter}
            showCustomRange={showCustomRange}
            startDateTime={startDateTime}
            endDateTime={endDateTime}
            onApplyQuickRange={applyQuickRange}
            onSelectCustom={handleSelectCustom}
            onStartDateTimeChange={handleStartDateTimeChange}
            onEndDateTimeChange={handleEndDateTimeChange}
            onToggleCustomRange={() =>
              setShowCustomRange((current) => !current)
            }
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
            onUpdateStatus={updateTransactionStatus}
            groups={groupedTransactions}
          />
        </Stack>
      </Container>

      <TransactionsTotalsBar
        expanded={showTotals}
        onToggle={() => setShowTotals((current) => !current)}
        periodLabel={periodLabel}
        salesTotal={filteredSalesTotal}
        netSalesTotal={filteredNetSalesTotal}
        refundedTotal={filteredRefundedTotal}
        voidedTotal={filteredVoidedTotal}
        voidedCount={filteredVoidedCount}
      />
    </MobilePageWrapper>
  );
}

"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import type { TransactionGroup } from "@/app/components/transactions-catalog";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function toCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type ActiveFilter = "today" | "week" | "month" | "year" | "custom" | null;

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
  const [showTotals, setShowTotals] = useState(true);
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

  const hasRangeFilter = startDateTime !== "" || endDateTime !== "";

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

        if (transaction.status === "PAID") {
          totals.filteredSalesTotal += amount;
        }

        if (transaction.status === "REFUNDED") {
          totals.filteredRefundedTotal += amount;
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

  const applyQuickRange = (
    filter: Exclude<ActiveFilter, "custom" | null>,
    start: Date,
    end: Date,
  ) => {
    setActiveFilter(filter);
    setShowCustomRange((current) => !current);
    setStartDateTime(toDateTimeLocalValue(start));
    setEndDateTime(toDateTimeLocalValue(end));
  };

  return (
    <MobilePageWrapper title="Sales">
      <Container maxWidth="sm" sx={{ py: 0.5, pb: showTotals ? 13 : 8 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              pt: 0.25,
              pb: 0.25,
              bgcolor: "background.default",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                borderColor: "divider",
                borderRadius: 1,
                marginTop: 1,
              }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
                sx={{
                  "& .MuiButton-root": {
                    minWidth: 0,
                    px: 1,
                  },
                }}
              >
                <Button
                  size="small"
                  variant={activeFilter === "today" ? "contained" : "outlined"}
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now);
                    start.setHours(0, 0, 0, 0);
                    applyQuickRange("today", start, now);
                  }}
                >
                  Today
                </Button>
                <Button
                  size="small"
                  variant={activeFilter === "week" ? "contained" : "outlined"}
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now);
                    const dayOfWeek = start.getDay();
                    const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    start.setDate(start.getDate() - dayOffset);
                    start.setHours(0, 0, 0, 0);
                    applyQuickRange("week", start, now);
                  }}
                >
                  Week
                </Button>
                <Button
                  size="small"
                  variant={activeFilter === "month" ? "contained" : "outlined"}
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      1,
                    );
                    applyQuickRange("month", start, now);
                  }}
                >
                  Month
                </Button>
                <Button
                  size="small"
                  variant={activeFilter === "year" ? "contained" : "outlined"}
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), 0, 1);
                    applyQuickRange("year", start, now);
                  }}
                >
                  Year
                </Button>
                <Button
                  size="small"
                  variant={activeFilter === "custom" ? "contained" : "outlined"}
                  onClick={() => {
                    setActiveFilter("custom");
                    setShowCustomRange((current) => !current);
                  }}
                >
                  Custom
                </Button>
                <div style={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  aria-label="clear range"
                  disabled={!hasRangeFilter}
                  onClick={() => {
                    setStartDateTime("");
                    setEndDateTime("");
                    setActiveFilter(null);
                  }}
                >
                  <CloseRounded fontSize="small" />
                </IconButton>
              </Stack>

              <Collapse in={showCustomRange}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.75}
                  alignItems="stretch"
                  sx={{ mt: 1 }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="From"
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(event) => {
                      setActiveFilter("custom");
                      setStartDateTime(event.target.value);
                    }}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="To"
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(event) => {
                      setActiveFilter("custom");
                      setEndDateTime(event.target.value);
                    }}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Stack>
              </Collapse>
            </Paper>
          </Box>

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

      {showTotals ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(env(safe-area-inset-bottom) + 68px)",
            px: 1.5,
            py: 1,
            pointerEvents: "none",
            zIndex: 8,
          }}
        >
          <Container maxWidth="sm" sx={{ px: "0 !important" }}>
            <Paper
              elevation={4}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                p: 1.25,
                pointerEvents: "auto",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={1.25}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Sales
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {toCurrency(filteredSalesTotal)}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    Net Sales
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {toCurrency(filteredNetSalesTotal)}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">
                    Refunded Sales
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                    color="warning.main"
                  >
                    {toCurrency(filteredRefundedTotal)}
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  mt: 0.75,
                  pt: 0.75,
                  borderTop: "1px dashed",
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Voided Orders ({filteredVoidedCount})
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                  color="text.secondary"
                >
                  {toCurrency(filteredVoidedTotal)}
                </Typography>
              </Box>
            </Paper>
          </Container>
        </Box>
      ) : null}

      <Fab
        size="small"
        color={showTotals ? "primary" : "default"}
        onClick={() => setShowTotals((current) => !current)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: showTotals
            ? "calc(env(safe-area-inset-bottom) + 196px)"
            : "calc(env(safe-area-inset-bottom) + 82px)",
          zIndex: 9,
        }}
        aria-label={showTotals ? "hide totals" : "show totals"}
      >
        {showTotals ? (
          <VisibilityOffRounded fontSize="small" />
        ) : (
          <VisibilityRounded fontSize="small" />
        )}
      </Fab>
    </MobilePageWrapper>
  );
}

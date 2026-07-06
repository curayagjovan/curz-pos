"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import TransactionsCatalog from "@/app/components/transactions-catalog";
import { useTransactions } from "@/app/context/transactions-context";
import MobilePageWrapper from "@/app/layouts/mobile-page-wrapper";

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default function TransactionsPage() {
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const { transactions, loading, error, updateTransactionStatus } =
    useTransactions();

  const filteredTransactions = useMemo(() => {
    if (!startDateTime && !endDateTime) {
      return transactions;
    }

    const startTime = startDateTime ? new Date(startDateTime).getTime() : null;
    const endTime = endDateTime ? new Date(endDateTime).getTime() : null;

    if (
      (startTime !== null && Number.isNaN(startTime)) ||
      (endTime !== null && Number.isNaN(endTime))
    ) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const transactionTime = new Date(transaction.createdAt).getTime();

      if (Number.isNaN(transactionTime)) {
        return false;
      }

      return (
        (startTime === null || transactionTime >= startTime) &&
        (endTime === null || transactionTime <= endTime)
      );
    });
  }, [transactions, startDateTime, endDateTime]);

  const hasRangeFilter = startDateTime !== "" || endDateTime !== "";

  const applyQuickRange = (start: Date, end: Date) => {
    setStartDateTime(toDateTimeLocalValue(start));
    setEndDateTime(toDateTimeLocalValue(end));
  };

  return (
    <MobilePageWrapper title="Sales">
      <Container maxWidth="sm" sx={{ py: 0.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                applyQuickRange(start, now);
              }}
            >
              Today
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                const dayOfWeek = start.getDay();
                const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                start.setDate(start.getDate() - dayOffset);
                start.setHours(0, 0, 0, 0);
                applyQuickRange(start, now);
              }}
            >
              This Week
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                applyQuickRange(start, now);
              }}
            >
              This Month
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                applyQuickRange(start, now);
              }}
            >
              This Year
            </Button>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems="stretch"
          >
            <TextField
              fullWidth
              size="small"
              label="From"
              type="datetime-local"
              value={startDateTime}
              onChange={(event) => setStartDateTime(event.target.value)}
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
              onChange={(event) => setEndDateTime(event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Stack>

          {hasRangeFilter ? (
            <Box>
              <Button
                size="small"
                onClick={() => {
                  setStartDateTime("");
                  setEndDateTime("");
                }}
              >
                Clear Range
              </Button>
            </Box>
          ) : null}

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
          />
        </Stack>
      </Container>
    </MobilePageWrapper>
  );
}

"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DateRangeRounded from "@mui/icons-material/DateRangeRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import TodayRounded from "@mui/icons-material/TodayRounded";
import {
  addDays,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "@/app/components/week-strip-filter";
import type { SalesPeriodSummary, SalesSummary } from "@/app/hooks/use-sales-summary";
import { formatCurrency as toCurrency } from "@/lib/currency";

const dayLabelFormatter = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

const shortDayFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

const monthLabelFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});

const yearLabelFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
});

type TransactionsTotalsBarProps = {
  expanded: boolean;
  onToggle: () => void;
  referenceDate: Date;
  summary: SalesSummary | null;
  loading: boolean;
  error: string | null;
};

type PeriodRow = {
  key: keyof SalesSummary;
  title: string;
  icon: ReactNode;
  label: string;
};

function PeriodReport({
  title,
  icon,
  label,
  data,
  showSpinner,
}: {
  title: string;
  icon: ReactNode;
  label: string;
  data: SalesPeriodSummary | undefined;
  showSpinner: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "14px",
        bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ display: "flex", color: "primary.main" }}>{icon}</Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          Total Sales
        </Typography>
        {showSpinner ? (
          <CircularProgress size={14} />
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {toCurrency(data?.salesTotal ?? 0)}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mt: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Net
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {toCurrency(data?.netSalesTotal ?? 0)}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Refunded
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="warning.main">
            {toCurrency(data?.refundedTotal ?? 0)}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <Typography variant="caption" color="text.secondary">
            Voided ({data?.voidedCount ?? 0})
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.secondary">
            {toCurrency(data?.voidedTotal ?? 0)}
          </Typography>
        </Box>
      </Stack>

      {(data?.pendingCount ?? 0) > 0 ? (
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          sx={{ mt: 1 }}
        >
          <Typography variant="caption" color="text.secondary">
            Balance Due ({data?.pendingCount ?? 0})
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} color="info.main">
            {toCurrency(data?.pendingTotal ?? 0)}
          </Typography>
        </Stack>
      ) : null}

      <Divider sx={{ my: 1, borderStyle: "dashed" }} />

      <Typography variant="caption" color="text.secondary">
        {(data?.orderCount ?? 0).toLocaleString()} orders
      </Typography>
    </Box>
  );
}

export default function TransactionsTotalsBar({
  expanded,
  onToggle,
  referenceDate,
  summary,
  loading,
  error,
}: TransactionsTotalsBarProps) {
  const isToday = isSameDay(referenceDate, startOfDay(new Date()));
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = addDays(weekStart, 6);

  const periods: PeriodRow[] = [
    {
      key: "day",
      title: isToday ? "Today" : "Selected Day",
      icon: <TodayRounded fontSize="small" />,
      label: isToday ? "Today" : dayLabelFormatter.format(referenceDate),
    },
    {
      key: "week",
      title: "This Week",
      icon: <DateRangeRounded fontSize="small" />,
      label: `${shortDayFormatter.format(weekStart)} – ${shortDayFormatter.format(weekEnd)}`,
    },
    {
      key: "month",
      title: "This Month",
      icon: <CalendarMonthRounded fontSize="small" />,
      label: monthLabelFormatter.format(referenceDate),
    },
    {
      key: "year",
      title: "This Year",
      icon: <EventRounded fontSize="small" />,
      label: yearLabelFormatter.format(referenceDate),
    },
  ];

  return (
    <>
      <Fab
        color="primary"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-label="show sales report"
        onClick={onToggle}
        sx={{
          position: "fixed",
          right: "calc(env(safe-area-inset-right) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
          zIndex: 1201,
        }}
      >
        <ReceiptLongRounded fontSize="small" />
      </Fab>

      <SwipeableDrawer
        anchor="bottom"
        open={expanded}
        onClose={onToggle}
        onOpen={() => {}}
        disableSwipeToOpen
        slotProps={{
          paper: {
            sx: {
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              pb: "env(safe-area-inset-bottom)",
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1.25, flexShrink: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Sales Report</Typography>
            <IconButton onClick={onToggle} aria-label="close sales report">
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Day, week, month, and year totals as of{" "}
            {dayLabelFormatter.format(referenceDate)}
          </Typography>
        </Box>

        <Divider sx={{ flexShrink: 0 }} />

        <Box sx={{ overflowY: "auto", px: 2, py: 1.5 }}>
          {error ? (
            <Typography variant="body2" color="error.main" sx={{ py: 2 }}>
              {error}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {periods.map((period) => (
                <PeriodReport
                  key={period.key}
                  title={period.title}
                  icon={period.icon}
                  label={period.label}
                  data={summary?.[period.key]}
                  showSpinner={loading && !summary}
                />
              ))}
            </Stack>
          )}
        </Box>
      </SwipeableDrawer>
    </>
  );
}

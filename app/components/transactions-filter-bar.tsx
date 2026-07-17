"use client";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SegmentedControl from "@/app/components/segmented-control";
import type { SegmentOption } from "@/app/components/segmented-control";

export type ActiveFilter =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom"
  | null;

type QuickFilter = Exclude<ActiveFilter, "custom" | null>;

type TransactionsFilterBarProps = {
  activeFilter: ActiveFilter;
  startDateTime: string;
  endDateTime: string;
  onApplyQuickRange: (filter: QuickFilter, start: Date, end: Date) => void;
  onSelectCustom: () => void;
  onStartDateTimeChange: (value: string) => void;
  onEndDateTimeChange: (value: string) => void;
};

const SEGMENTS: SegmentOption[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
];

function getQuickRange(filter: QuickFilter) {
  const now = new Date();
  const start = new Date(now);

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const dayOfWeek = start.getDay();
      const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - dayOffset);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }

  return { start, end: now };
}

type DateRowProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateRow({ label, value, onChange }: DateRowProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ px: 2, py: 1.1 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <InputBase
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputProps={{ "aria-label": `${label} date and time` }}
        sx={{
          borderRadius: "8px",
          bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.07)",
          px: 1,
          py: 0.4,
          fontSize: 15,
          "& input": { p: 0 },
        }}
      />
    </Stack>
  );
}

export default function TransactionsFilterBar({
  activeFilter,
  startDateTime,
  endDateTime,
  onApplyQuickRange,
  onSelectCustom,
  onStartDateTimeChange,
  onEndDateTimeChange,
}: TransactionsFilterBarProps) {
  const handleSelect = (key: string) => {
    if (key === "custom") {
      onSelectCustom();
      return;
    }

    const quickFilter = key as QuickFilter;
    const { start, end } = getQuickRange(quickFilter);
    onApplyQuickRange(quickFilter, start, end);
  };

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        pt: 0.5,
        pb: 0.5,
        bgcolor: "background.default",
      }}
    >
      <SegmentedControl
        ariaLabel="sales period"
        segments={SEGMENTS}
        selectedKeys={activeFilter ? [activeFilter] : []}
        onSelect={handleSelect}
      />

      <Collapse in={activeFilter === "custom"} timeout={260}>
        <Box
          sx={{
            mt: 1,
            borderRadius: "12px",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <DateRow
            label="From"
            value={startDateTime}
            onChange={onStartDateTimeChange}
          />
          <Divider sx={{ ml: 2 }} />
          <DateRow
            label="To"
            value={endDateTime}
            onChange={onEndDateTimeChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

"use client";

import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ExpandLessRounded from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import Chip from "@mui/material/Chip";

export type ActiveFilter =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom"
  | null;

type TransactionsFilterBarProps = {
  activeFilter: ActiveFilter;
  showCustomRange: boolean;
  startDateTime: string;
  endDateTime: string;
  onApplyQuickRange: (
    filter: Exclude<ActiveFilter, "custom" | null>,
    start: Date,
    end: Date,
  ) => void;
  onSelectCustom: () => void;
  onStartDateTimeChange: (value: string) => void;
  onEndDateTimeChange: (value: string) => void;
  onToggleCustomRange: () => void;
};

export default function TransactionsFilterBar({
  activeFilter,
  showCustomRange,
  startDateTime,
  endDateTime,
  onApplyQuickRange,
  onSelectCustom,
  onStartDateTimeChange,
  onEndDateTimeChange,
  onToggleCustomRange,
}: TransactionsFilterBarProps) {
  return (
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
          borderRadius: 2,
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
          <Chip
            label="Today"
            color={activeFilter === "today" ? "primary" : "default"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              onApplyQuickRange("today", start, now);
            }}
          />

          <Chip
            label="Week"
            color={activeFilter === "week" ? "primary" : "default"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              const dayOfWeek = start.getDay();
              const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              start.setDate(start.getDate() - dayOffset);
              start.setHours(0, 0, 0, 0);
              onApplyQuickRange("week", start, now);
            }}
          />

          <Chip
            label="Month"
            color={activeFilter === "month" ? "primary" : "default"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              onApplyQuickRange("month", start, now);
            }}
          />

          <Chip
            label="Year"
            color={activeFilter === "year" ? "primary" : "default"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 1);
              onApplyQuickRange("year", start, now);
            }}
          />

          <Chip
            label="Custom"
            color={activeFilter === "custom" ? "primary" : "default"}
            onClick={onSelectCustom}
          />
          <div style={{ flexGrow: 1 }} />
          <IconButton
            size="small"
            aria-label={
              showCustomRange
                ? "hide date range inputs"
                : "show date range inputs"
            }
            onClick={onToggleCustomRange}
          >
            {showCustomRange ? (
              <ExpandLessRounded fontSize="small" />
            ) : (
              <ExpandMoreRounded fontSize="small" />
            )}
          </IconButton>
        </Stack>

        <Collapse in={showCustomRange}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={0.75}
            alignItems="stretch"
            sx={{ mt: 1.5 }}
          >
            <TextField
              fullWidth
              size="small"
              label="From"
              type="datetime-local"
              value={startDateTime}
              onChange={(event) => onStartDateTimeChange(event.target.value)}
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
              onChange={(event) => onEndDateTimeChange(event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );
}

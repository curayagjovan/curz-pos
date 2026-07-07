"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CloseRounded from "@mui/icons-material/CloseRounded";

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
  hasRangeFilter: boolean;
  onApplyQuickRange: (
    filter: Exclude<ActiveFilter, "custom" | null>,
    start: Date,
    end: Date,
  ) => void;
  onSelectCustom: () => void;
  onClearRange: () => void;
  onStartDateTimeChange: (value: string) => void;
  onEndDateTimeChange: (value: string) => void;
  onCloseCustomRange: () => void;
};

export default function TransactionsFilterBar({
  activeFilter,
  showCustomRange,
  startDateTime,
  endDateTime,
  hasRangeFilter,
  onApplyQuickRange,
  onSelectCustom,
  onClearRange,
  onStartDateTimeChange,
  onEndDateTimeChange,
  onCloseCustomRange,
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
          <Button
            size="small"
            variant={activeFilter === "today" ? "contained" : "outlined"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              onApplyQuickRange("today", start, now);
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
              onApplyQuickRange("week", start, now);
            }}
          >
            Week
          </Button>
          <Button
            size="small"
            variant={activeFilter === "month" ? "contained" : "outlined"}
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              onApplyQuickRange("month", start, now);
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
              onApplyQuickRange("year", start, now);
            }}
          >
            Year
          </Button>
          <Button
            size="small"
            variant={activeFilter === "custom" ? "contained" : "outlined"}
            onClick={onSelectCustom}
          >
            Custom
          </Button>
          <div style={{ flexGrow: 1 }} />
          <IconButton
            size="small"
            aria-label="clear range"
            disabled={!hasRangeFilter}
            onClick={onClearRange}
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

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.75 }}>
            <Button
              size="small"
              color="inherit"
              startIcon={<CloseRounded fontSize="small" />}
              onClick={onCloseCustomRange}
            >
              Close
            </Button>
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );
}

"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import { useWeekSwipe, SLIDE_TRANSITION } from "@/app/hooks/use-week-swipe";
import { addDays, isSameDay, startOfDay, startOfWeek } from "@/lib/week-dates";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const pillFormatter = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

const compactAmountFormatter = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const weekTotalFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

type WeekStripFilterProps = {
  selectedDate: Date;
  // Sales totals for the visible week, Monday first.
  dayTotals: number[];
  onSelectDate: (date: Date) => void;
};

export default function WeekStripFilter({
  selectedDate,
  dayTotals,
  onSelectDate,
}: WeekStripFilterProps) {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(selectedDate);
  const currentWeekDays = DAY_LABELS.map((_, index) =>
    addDays(weekStart, index),
  );
  const prevWeekDays = DAY_LABELS.map((_, index) =>
    addDays(weekStart, index - 7),
  );
  const nextWeekDays = DAY_LABELS.map((_, index) =>
    addDays(weekStart, index + 7),
  );
  const weekTotal = dayTotals.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );

  const {
    trackRef,
    dragPx,
    stage,
    transitionEnabled,
    goToWeek,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    handleTransitionEnd,
    handleDayClick,
  } = useWeekSwipe(selectedDate, onSelectDate);

  const renderWeekPane = (days: Date[], interactive: boolean) =>
    days.map((day, index) => {
      const isSelected = interactive && isSameDay(day, selectedDate);
      const isToday = isSameDay(day, today);
      const total = interactive ? (dayTotals[index] ?? 0) : null;

      const content = (
        <>
          <Typography
            variant="caption"
            sx={{
              fontSize: 10,
              letterSpacing: 0.6,
              color: "text.secondary",
            }}
          >
            {DAY_LABELS[index]}
          </Typography>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              typography: "body1",
              fontWeight: isSelected ? 700 : 500,
              bgcolor: isSelected
                ? isToday
                  ? "primary.main"
                  : "text.primary"
                : "transparent",
              color: isSelected
                ? isToday
                  ? "primary.contrastText"
                  : "background.paper"
                : isToday
                  ? "primary.main"
                  : "text.primary",
              transition: "background-color 160ms ease, color 160ms ease",
            }}
          >
            {day.getDate()}
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              color:
                total !== null && total > 0
                  ? isToday
                    ? "primary.main"
                    : "text.secondary"
                  : "text.disabled",
            }}
          >
            {total === null
              ? "···"
              : `₱${compactAmountFormatter.format(total)}`}
          </Typography>
        </>
      );

      const cellSx = {
        flexDirection: "column",
        gap: 0.5,
        py: 0.5,
        borderRadius: "10px",
      } as const;

      return interactive ? (
        <ButtonBase
          key={day.toISOString()}
          onClick={() => handleDayClick(day)}
          aria-label={`view sales for ${pillFormatter.format(day)}`}
          sx={cellSx}
        >
          {content}
        </ButtonBase>
      ) : (
        <Box
          key={day.toISOString()}
          aria-hidden
          sx={{ display: "flex", ...cellSx }}
        >
          {content}
        </Box>
      );
    });

  const handleDatePicked = (value: string) => {
    if (!value) {
      return;
    }

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return;
    }

    onSelectDate(new Date(year, month - 1, day));
  };

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        pb: 1,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          pt: 0.5,
          pb: 0.75,
          borderRadius: "10px",
          bgcolor: "rgba(var(--mui-palette-text-primaryChannel) / 0.06)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ pl: 2, pr: 1 }}
        >
          {/* The invisible date input sits on top of the pill so tapping it
            opens the platform's native calendar picker. */}
          <Box
            component="label"
            sx={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              px: 1.5,
              py: 0.7,
              borderRadius: "10px",
              border: "1px solid",
              borderColor: "divider",
              cursor: "pointer",
            }}
          >
            <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
              {pillFormatter.format(selectedDate)}
            </Typography>
            <Box
              component="input"
              type="date"
              value={toDateInputValue(selectedDate)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                handleDatePicked(event.target.value)
              }
              aria-label="pick a date"
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                border: 0,
                p: 0,
                cursor: "pointer",
                "&::-webkit-calendar-picker-indicator": {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                },
              }}
            />
          </Box>

          <Stack direction="row" alignItems="center" spacing={0}>
            <IconButton
              aria-label="back to today"
              onClick={() => onSelectDate(startOfDay(new Date()))}
            >
              <EventRepeatRounded fontSize="small" />
            </IconButton>
            <IconButton aria-label="previous week" onClick={() => goToWeek(-1)}>
              <ChevronLeftRounded />
            </IconButton>
            <IconButton aria-label="next week" onClick={() => goToWeek(1)}>
              <ChevronRightRounded />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 1,
            position: "relative",
            overflow: "hidden",
            borderRadius: "10px",
          }}
        >
          {/* Previous week — tiled immediately to the left, revealed as the
            current pane is dragged rightward. */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              pointerEvents: "none",
              transform: `translateX(calc(-100% + ${dragPx}px))`,
              transition: transitionEnabled ? SLIDE_TRANSITION : "none",
            }}
          >
            {renderWeekPane(prevWeekDays, false)}
          </Box>

          {/* Current week — the only interactive pane; also owns the drag
            gesture and defines the strip's height. */}
          <Box
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onTransitionEnd={handleTransitionEnd}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              touchAction: "pan-y",
              cursor: stage === "dragging" ? "grabbing" : "grab",
              userSelect: stage === "idle" ? "auto" : "none",
              transform: `translateX(${dragPx}px)`,
              transition: transitionEnabled ? SLIDE_TRANSITION : "none",
            }}
          >
            {renderWeekPane(currentWeekDays, true)}
          </Box>

          {/* Next week — tiled immediately to the right, revealed as the
            current pane is dragged leftward. */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              pointerEvents: "none",
              transform: `translateX(calc(100% + ${dragPx}px))`,
              transition: transitionEnabled ? SLIDE_TRANSITION : "none",
            }}
          >
            {renderWeekPane(nextWeekDays, false)}
          </Box>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, px: 2 }}
        >
          Week total: {weekTotalFormatter.format(weekTotal)}
        </Typography>
      </Box>
    </Box>
  );
}

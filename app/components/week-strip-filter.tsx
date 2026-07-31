"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

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

type SwipeStage = "idle" | "dragging" | "settling";

const SLIDE_TRANSITION = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";

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

  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);
  const pendingDirectionRef = useRef<1 | -1 | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerCapturedRef = useRef(false);
  const [dragPx, setDragPx] = useState(0);
  const [stage, setStage] = useState<SwipeStage>("idle");
  const transitionEnabled = stage === "settling";

  const getTrackWidth = () =>
    trackRef.current?.getBoundingClientRect().width || 0;

  const goToWeek = (direction: 1 | -1) => {
    if (stage !== "idle") {
      return;
    }
    const width = getTrackWidth() || 1;
    pendingDirectionRef.current = direction;
    setStage("settling");
    setDragPx(-direction * width);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "idle" || !event.isPrimary) {
      return;
    }
    dragStartXRef.current = event.clientX;
    dragDistanceRef.current = 0;
    activePointerIdRef.current = event.pointerId;
    pointerCapturedRef.current = false;
    setStage("dragging");
    // Pointer capture is acquired lazily once real movement is detected (see
    // handlePointerMove) — capturing immediately on pointerdown swallows the
    // click event for plain taps on the day pills.
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "dragging" || dragStartXRef.current === null) {
      return;
    }
    const delta = event.clientX - dragStartXRef.current;
    dragDistanceRef.current = Math.abs(delta);
    if (!pointerCapturedRef.current && dragDistanceRef.current > 4) {
      pointerCapturedRef.current = true;
      trackRef.current?.setPointerCapture(event.pointerId);
    }
    setDragPx(delta);
  };

  const endDrag = () => {
    if (stage !== "dragging") {
      return;
    }
    if (pointerCapturedRef.current && activePointerIdRef.current !== null) {
      trackRef.current?.releasePointerCapture(activePointerIdRef.current);
    }
    pointerCapturedRef.current = false;
    activePointerIdRef.current = null;
    const delta = dragPx;
    const width = getTrackWidth() || 1;
    const threshold = Math.min(56, width * 0.18);
    dragStartXRef.current = null;

    if (Math.abs(delta) > threshold) {
      const direction: 1 | -1 = delta < 0 ? 1 : -1;
      pendingDirectionRef.current = direction;
      setStage("settling");
      setDragPx(-direction * width);
    } else {
      pendingDirectionRef.current = null;
      setStage("settling");
      setDragPx(0);
    }
  };

  const handleTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (
      stage !== "settling" ||
      event.target !== trackRef.current ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    // The neighboring pane is already tiled edge-to-edge with the current
    // one, so once it slides fully into view its content IS the new current
    // week — swapping selectedDate and resetting dragPx to 0 in the same
    // update lands on the exact same pixel position, with no teleport.
    const direction = pendingDirectionRef.current;
    pendingDirectionRef.current = null;
    if (direction) {
      onSelectDate(addDays(selectedDate, direction * 7));
    }
    setStage("idle");
    setDragPx(0);
  };

  const handleDayClick = (day: Date) => {
    if (dragDistanceRef.current > 6) {
      return;
    }
    onSelectDate(day);
  };

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
          sx={{ px: 2 }}
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
          sx={{ display: "block", mt: 0.5, px: 2.5 }}
        >
          Week total: {weekTotalFormatter.format(weekTotal)}
        </Typography>
      </Box>
    </Box>
  );
}

import { useRef, useState } from "react";
import { addDays } from "@/lib/week-dates";

type SwipeStage = "idle" | "dragging" | "settling";

export const SLIDE_TRANSITION = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";

// Drives the week strip's swipe-between-weeks carousel: three tiled panes
// (prev/current/next week) that drag together, then settle into place —
// either snapping back on a small drag, or sliding a full pane-width to
// commit to the neighboring week, which is when `onSelectDate` actually
// fires (shifting selectedDate by 7 days in the committed direction).
export function useWeekSwipe(selectedDate: Date, onSelectDate: (date: Date) => void) {
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

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
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

  return {
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
  };
}

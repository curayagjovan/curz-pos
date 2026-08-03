import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Product } from "@/types/product";

// Delay before a press starts auto-adding, and the pace of each add while
// held — tuned so a quick tap never triggers it, but a deliberate hold can
// stack up a multi-unit sale (e.g. 6 sodas) without repeated tapping.
const LONG_PRESS_DELAY_MS = 350;
const HOLD_REPEAT_INTERVAL_MS = 140;

// Drives the product catalog card's tap-to-add-one / hold-to-add-many
// gesture, plus the "Added" / "+N" feedback chip that flashes afterward.
export function useCatalogAddGesture(
  product: Product,
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void,
) {
  const [isAddedFeedbackVisible, setIsAddedFeedbackVisible] = useState(false);
  const [addedFeedbackCount, setAddedFeedbackCount] = useState(1);
  const [holdAddCount, setHoldAddCount] = useState(0);
  const addedFeedbackTimeoutRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdCountRef = useRef(0);
  const isLongPressRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (addedFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(addedFeedbackTimeoutRef.current);
      }
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }
      if (holdIntervalRef.current !== null) {
        window.clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const triggerAddedFeedback = (count = 1) => {
    if (addedFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(addedFeedbackTimeoutRef.current);
    }

    setAddedFeedbackCount(count);
    setIsAddedFeedbackVisible(true);
    addedFeedbackTimeoutRef.current = window.setTimeout(() => {
      setIsAddedFeedbackVisible(false);
      addedFeedbackTimeoutRef.current = null;
    }, 820);
  };

  const clearHoldTimers = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    isLongPressRef.current = false;
    holdCountRef.current = 0;
    clearHoldTimers();

    holdTimeoutRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      holdIntervalRef.current = window.setInterval(() => {
        holdCountRef.current += 1;
        setHoldAddCount(holdCountRef.current);
        onAddToCart(product);
      }, HOLD_REPEAT_INTERVAL_MS);
    }, LONG_PRESS_DELAY_MS);
  };

  const endHold = () => {
    clearHoldTimers();

    if (isLongPressRef.current) {
      triggerAddedFeedback(holdCountRef.current);
      suppressClickRef.current = true;
    }

    setHoldAddCount(0);
  };

  const handleCardTap = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      isLongPressRef.current = false;
      return;
    }

    triggerAddedFeedback(1);
    onAddToCart(product, event.currentTarget.getBoundingClientRect());
  };

  return {
    isAddedFeedbackVisible,
    addedFeedbackCount,
    holdAddCount,
    handlePointerDown,
    endHold,
    handleCardTap,
  };
}

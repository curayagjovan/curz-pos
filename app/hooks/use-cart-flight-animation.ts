import { useCallback, useEffect, useRef, useState } from "react";

export type CartFlight = {
  id: number;
  label: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  active: boolean;
};

export const CART_FLIGHT_DURATION_MS = 620;

// Drives the "flying label" animation that arcs from a tapped product card
// to the cart FAB, plus the FAB's pulse/badge-bounce feedback. `cartFabRef`
// is the animation's landing target — attach it to the cart Fab itself.
export function useCartFlightAnimation() {
  const [isCartPulseVisible, setIsCartPulseVisible] = useState(false);
  const [cartFlights, setCartFlights] = useState<CartFlight[]>([]);
  const cartPulseTimeoutRef = useRef<number | null>(null);
  const cartFabRef = useRef<HTMLButtonElement | null>(null);
  const cartFlightIdRef = useRef(0);
  const cartFlightFrameRef = useRef<number[]>([]);
  const cartFlightTimeoutRef = useRef<number[]>([]);

  const triggerCartPulse = useCallback(() => {
    if (cartPulseTimeoutRef.current !== null) {
      window.clearTimeout(cartPulseTimeoutRef.current);
    }

    setIsCartPulseVisible(true);
    cartPulseTimeoutRef.current = window.setTimeout(() => {
      setIsCartPulseVisible(false);
      cartPulseTimeoutRef.current = null;
    }, 650);
  }, []);

  useEffect(() => {
    return () => {
      if (cartPulseTimeoutRef.current !== null) {
        window.clearTimeout(cartPulseTimeoutRef.current);
      }

      for (const frameId of cartFlightFrameRef.current) {
        window.cancelAnimationFrame(frameId);
      }

      for (const timeoutId of cartFlightTimeoutRef.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // Launches the flying-label animation from `sourceRect` (the tapped
  // card's bounding rect) to the cart FAB. Falls back to just the FAB pulse
  // when there's no source rect, no FAB mounted yet, or the user prefers
  // reduced motion.
  const launchCartFlight = useCallback(
    (label: string, sourceRect?: DOMRect) => {
      const targetRect = cartFabRef.current?.getBoundingClientRect();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!sourceRect || !targetRect || prefersReducedMotion) {
        triggerCartPulse();
        return;
      }

      const id = cartFlightIdRef.current + 1;
      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      cartFlightIdRef.current = id;
      setCartFlights((current) => [
        ...current,
        {
          id,
          label,
          startX,
          startY,
          deltaX: endX - startX,
          deltaY: endY - startY,
          active: false,
        },
      ]);

      const frameId = window.requestAnimationFrame(() => {
        setCartFlights((current) =>
          current.map((flight) =>
            flight.id === id ? { ...flight, active: true } : flight,
          ),
        );
        cartFlightFrameRef.current = cartFlightFrameRef.current.filter(
          (currentId) => currentId !== frameId,
        );
      });
      cartFlightFrameRef.current.push(frameId);

      const pulseTimeoutId = window.setTimeout(() => {
        triggerCartPulse();
        cartFlightTimeoutRef.current = cartFlightTimeoutRef.current.filter(
          (currentId) => currentId !== pulseTimeoutId,
        );
      }, CART_FLIGHT_DURATION_MS - 120);
      cartFlightTimeoutRef.current.push(pulseTimeoutId);

      const cleanupTimeoutId = window.setTimeout(() => {
        setCartFlights((current) =>
          current.filter((flight) => flight.id !== id),
        );
        cartFlightTimeoutRef.current = cartFlightTimeoutRef.current.filter(
          (currentId) => currentId !== cleanupTimeoutId,
        );
      }, CART_FLIGHT_DURATION_MS + 120);
      cartFlightTimeoutRef.current.push(cleanupTimeoutId);
    },
    [triggerCartPulse],
  );

  return {
    cartFlights,
    isCartPulseVisible,
    cartFabRef,
    launchCartFlight,
  };
}

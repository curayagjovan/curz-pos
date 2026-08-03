import { useRef, useState, type TouchEvent } from "react";
import type { Product } from "@/types/product";

const SWIPE_ACTION_WIDTH = 92;

// Drives the inventory card's swipe-left-to-reveal-delete gesture. Tapping
// the card while the delete action is revealed dismisses it instead of
// adding to cart — the swipe has to be explicitly closed before a tap acts
// on the product again.
export function useSwipeToDelete(
  product: Product,
  onAddToCart: (product: Product) => void,
  onRequestDelete: ((product: Product) => void) | undefined,
  deleteDisabled: boolean,
) {
  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const swipingRef = useRef(false);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!onRequestDelete) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    swipingRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (
      !onRequestDelete ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (!swipingRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (Math.abs(deltaX) > 8) {
        swipingRef.current = true;
      }
    }

    if (!swipingRef.current) {
      return;
    }

    const baseOffset = isDeleteRevealed ? -SWIPE_ACTION_WIDTH : 0;
    const nextOffset = Math.min(
      0,
      Math.max(-SWIPE_ACTION_WIDTH, baseOffset + deltaX),
    );
    setDragOffset(nextOffset);
  };

  const handleTouchEnd = () => {
    if (!onRequestDelete) {
      return;
    }

    const shouldReveal = dragOffset <= -SWIPE_ACTION_WIDTH / 2;
    setIsDeleteRevealed(shouldReveal);
    setDragOffset(shouldReveal ? -SWIPE_ACTION_WIDTH : 0);

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    swipingRef.current = false;
  };

  const handleCardTap = () => {
    if (isDeleteRevealed) {
      setIsDeleteRevealed(false);
      setDragOffset(0);
      return;
    }

    onAddToCart(product);
  };

  const handleDeleteTap = () => {
    if (!onRequestDelete || deleteDisabled) {
      return;
    }

    setIsDeleteRevealed(false);
    setDragOffset(0);
    onRequestDelete(product);
  };

  return {
    isDeleteRevealed,
    dragOffset,
    swipingRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleCardTap,
    handleDeleteTap,
  };
}

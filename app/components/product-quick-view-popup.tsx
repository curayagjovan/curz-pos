"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import {
  Actions,
  ActionsButton,
  ActionsGroup,
  ActionsLabel,
  Popup,
} from "konsta/react";
import { type ProductListItem } from "../types";

type ProductQuickViewPopupProps = {
  product: ProductListItem | null;
  pressPosition: { x: number; y: number } | null;
  notice: string | null;
  onClose: () => void;
  onCopySku: () => void;
  onCopyName: () => void;
  formatPrice: (value: number | string) => string;
};

export default function ProductQuickViewPopup({
  product,
  pressPosition,
  notice,
  onClose,
  onCopySku,
  onCopyName,
  formatPrice,
}: ProductQuickViewPopupProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!product) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (cardRef.current?.contains(target)) {
        return;
      }

      if (actionsRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [product, onClose]);

  useEffect(() => {
    if (!product || !cardRef.current) {
      return;
    }

    const card = cardRef.current;
    const runAnimation = () => {
      const centerX = pressPosition?.x ?? window.innerWidth / 2;
      const centerY = pressPosition?.y ?? window.innerHeight / 2;
      const rect = card.getBoundingClientRect();

      // Clamp percentages to valid range (0-100)
      const originX = Math.max(
        0,
        Math.min(100, ((centerX - rect.left) / rect.width) * 100),
      );
      const originY = Math.max(
        0,
        Math.min(100, ((centerY - rect.top) / rect.height) * 100),
      );
      const originStr = `${originX}% ${originY}%`;

      console.log(
        "Press:",
        pressPosition,
        "Card rect:",
        rect,
        "Origin:",
        originStr,
      );

      card.style.transformOrigin = originStr;
      card.animate(
        [
          { transform: "scale(0.92)", opacity: 0.4 },
          { transform: "scale(1)", opacity: 1 },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
    };

    requestAnimationFrame(runAnimation);
  }, [product, pressPosition]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {product && <div className="fixed inset-0 z-30" onClick={onClose} />}

      {product && (
        <Popup opened backdrop={false} onBackdropClick={onClose}>
          <div className="flex h-full w-full items-start justify-center px-4 pt-[max(4.5rem,env(safe-area-inset-top))]">
            <div
              ref={cardRef}
              className="w-full max-w-lg rounded-4xl border border-white/15 bg-[#2f2f35]/92 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-8 font-semibold leading-tight tracking-[-0.01em] text-white">
                {product.name}
              </p>
              <p className="mt-3 text-[1.65rem] leading-tight text-white/80">
                SKU: {product.sku}
              </p>
              <p className="mt-1 text-[1.65rem] leading-tight text-white/80">
                Price: {formatPrice(product.price)}
              </p>
              {product.description && (
                <p className="mt-3 text-4 leading-6 text-white/75">
                  {product.description}
                </p>
              )}
            </div>
          </div>
        </Popup>
      )}

      {product && (
        <Actions
          ref={actionsRef}
          opened
          backdrop={false}
          onBackdropClick={onClose}
        >
          <ActionsGroup>
            <ActionsLabel>
              <div className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-3 text-black/55 dark:text-white/55">
                  Quick Actions
                </span>
                {notice && (
                  <span className="text-3 text-primary">{notice}</span>
                )}
              </div>
            </ActionsLabel>
            <ActionsButton
              className="text-[1.08rem] font-medium"
              onClick={onCopySku}
            >
              Copy SKU
            </ActionsButton>
            <ActionsButton
              className="text-[1.08rem] font-medium"
              onClick={onCopyName}
            >
              Copy Name
            </ActionsButton>
            <ActionsButton
              bold
              className="text-[1.08rem]"
              onClick={() => {
                const id = product.id;
                onClose();
                router.push(`/products/${id}`);
              }}
            >
              Edit Product
            </ActionsButton>
          </ActionsGroup>
        </Actions>
      )}
    </>,
    document.body,
  );
}

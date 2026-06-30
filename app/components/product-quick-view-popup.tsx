"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { MapPinIcon, TrashIcon, ShareIcon } from "@heroicons/react/24/outline";
import { type ProductListItem } from "../types";

type ProductQuickViewPopupProps = {
  product: ProductListItem | null;
  pressTarget: React.RefObject<HTMLElement | null>;
  notice: string | null;
  onClose: () => void;
  onEditProduct?: (productId: string) => void;
  onPinProduct?: (productId: string, isPinned: boolean) => Promise<void>;
  formatPrice: (value: number | string) => string;
};

export default function ProductQuickViewPopup({
  product,
  pressTarget,
  notice,
  onClose,
  onEditProduct,
  onPinProduct,
  formatPrice,
}: ProductQuickViewPopupProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const didOpenEditRef = useRef(false);

  const openEditPopup = (productId: string) => {
    if (didOpenEditRef.current) {
      return;
    }
    didOpenEditRef.current = true;
    onClose();
    onEditProduct?.(productId);
  };

  useEffect(() => {
    if (!product) {
      didOpenEditRef.current = false;
      return;
    }

    didOpenEditRef.current = false;
  }, [product]);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Position + animate whenever product changes
  useEffect(() => {
    const card = menuRef.current;
    if (!product || !card) return;

    card.style.visibility = "hidden";
    card.style.top = "0px";

    requestAnimationFrame(() => {
      if (!card) return;

      const menuH = card.offsetHeight;
      const winH = window.innerHeight;
      const MARGIN = 10;
      let top = winH / 2 - menuH / 2;
      let originY = "center";

      if (pressTarget.current) {
        const rect = pressTarget.current.getBoundingClientRect();
        if (rect.bottom + menuH + MARGIN <= winH) {
          top = rect.bottom + MARGIN;
          originY = "top";
        } else {
          top = Math.max(MARGIN + 44, rect.top - menuH - MARGIN);
          originY = "bottom";
        }
      }

      card.style.top = `${top}px`;
      card.style.transformOrigin = `center ${originY}`;
      card.style.visibility = "visible";

      card.animate(
        [
          { transform: "scale(0.72)", opacity: 0 },
          { transform: "scale(1.04)", opacity: 1, offset: 0.55 },
          { transform: "scale(0.98)", offset: 0.78 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 380, easing: "linear", fill: "both" },
      );
    });
  }, [product, pressTarget]);

  // Close on outside tap
  useEffect(() => {
    if (!product) return;
    const handler = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [product, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {product && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {product && (
        <div
          ref={menuRef}
          className="fixed left-4 right-4 z-50 mx-auto flex max-w-sm flex-col gap-3"
          style={{ top: 0, visibility: "hidden" }}
        >
          {/* Preview card - click to navigate to edit page */}
          <button
            type="button"
            className="overflow-hidden rounded-[20px] bg-white text-left shadow-[0_16px_48px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.12)] active:opacity-75 dark:bg-[#2c2c2e]"
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openEditPopup(product.id);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openEditPopup(product.id);
            }}
          >
            <div className="px-4 py-4">
              <p className="text-[1rem] font-semibold leading-snug text-[#1c1c1e] dark:text-white">
                {product.name}
              </p>
              <p className="mt-1 text-[0.82rem] text-[#8e8e93]">
                {product.sku} · {formatPrice(product.price)}
              </p>
              {product.description && (
                <p className="mt-2 line-clamp-3 text-[0.78rem] leading-relaxed text-[#8e8e93]">
                  {product.description}
                </p>
              )}
            </div>
          </button>

          {/* Actions card */}
          <div className="mx-auto w-fit min-w-52 overflow-hidden rounded-[20px] bg-ios-light-glass shadow-ios-light-glass backdrop-blur-lg dark:bg-ios-dark-glass dark:shadow-ios-dark-glass">
            {notice && (
              <>
                <p className="px-4 py-2.5 text-[0.72rem] font-medium text-brand-primary dark:text-[#0a84ff]">
                  {notice}
                </p>
                <div className="h-px bg-black/10 dark:bg-white/10" />
              </>
            )}

            <button
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/6 dark:active:bg-white/6"
              onClick={() => {
                onClose();
                if (onPinProduct) {
                  void onPinProduct(product.id, product.isPinned ?? false);
                }
              }}
            >
              <MapPinIcon
                className={
                  product.isPinned
                    ? "size-5 shrink-0 text-[#0a84ff]"
                    : "size-5 shrink-0 text-[#1c1c1e] dark:text-white"
                }
              />
              <span className="text-[0.95rem] text-[#1c1c1e] dark:text-white">
                {product.isPinned ? "Unpin Product" : "Pin Product"}
              </span>
            </button>

            <div className="mx-4 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

            <button
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/6 dark:active:bg-white/6"
              onClick={() => {
                // Share product using native iOS share
                if (navigator.share) {
                  navigator
                    .share({
                      title: product.name,
                      text: `${product.sku} · ${formatPrice(product.price)}`,
                      url: window.location.href,
                    })
                    .catch(() => {
                      /* User cancelled share */
                    });
                }
              }}
            >
              <ShareIcon className="size-5 shrink-0 text-[#1c1c1e] dark:text-white" />
              <span className="text-[0.95rem] text-[#1c1c1e] dark:text-white">
                Share Product
              </span>
            </button>

            <div className="mx-4 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

            <button
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/6 dark:active:bg-white/6"
              onClick={() => {
                // Delete product action
                onClose();
              }}
            >
              <TrashIcon className="size-5 shrink-0 text-red-500 dark:text-red-400" />
              <span className="text-[0.95rem] text-red-500 dark:text-red-400">
                Delete Product
              </span>
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { type ProductListItem } from "../types";

type ProductQuickViewPopupProps = {
  product: ProductListItem | null;
  pressTarget: React.RefObject<HTMLElement | null>;
  notice: string | null;
  onClose: () => void;
  onCopySku: () => void;
  onCopyName: () => void;
  formatPrice: (value: number | string) => string;
};

export default function ProductQuickViewPopup({
  product,
  pressTarget,
  notice,
  onClose,
  onCopySku,
  onCopyName,
  formatPrice,
}: ProductQuickViewPopupProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

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
          {/* Preview card */}
          <div className="overflow-hidden rounded-[20px] bg-white/90 shadow-[0_16px_48px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:bg-[#2c2c2e]/92">
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
          </div>

          {/* Actions card */}
          <div className="overflow-hidden rounded-[20px] bg-white/90 shadow-[0_16px_48px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:bg-[#2c2c2e]/92">
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
              onClick={onCopySku}
            >
              <svg
                className="size-5 shrink-0 text-[#1c1c1e] dark:text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                />
              </svg>
              <span className="text-[0.95rem] text-[#1c1c1e] dark:text-white">
                Copy SKU
              </span>
            </button>

            <div className="mx-4 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

            <button
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/6 dark:active:bg-white/6"
              onClick={onCopyName}
            >
              <svg
                className="size-5 shrink-0 text-[#1c1c1e] dark:text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
              <span className="text-[0.95rem] text-[#1c1c1e] dark:text-white">
                Copy Name
              </span>
            </button>

            <div className="mx-4 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

            <button
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-black/6 dark:active:bg-white/6"
              onClick={() => {
                const id = product.id;
                onClose();
                router.push(`/products/${id}`);
              }}
            >
              <svg
                className="size-5 shrink-0 text-brand-primary dark:text-[#0a84ff]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
              <span className="text-[0.95rem] font-semibold text-brand-primary dark:text-[#0a84ff]">
                Edit Product
              </span>
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

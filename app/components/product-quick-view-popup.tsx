"use client";

import { useRouter } from "next/navigation";
import { Button, Popup } from "konsta/react";
import { type ProductListItem } from "../types";

type ProductQuickViewPopupProps = {
  product: ProductListItem | null;
  notice: string | null;
  onClose: () => void;
  onCopySku: () => void;
  onCopyName: () => void;
  formatPrice: (value: number | string) => string;
};

export default function ProductQuickViewPopup({
  product,
  notice,
  onClose,
  onCopySku,
  onCopyName,
  formatPrice,
}: ProductQuickViewPopupProps) {
  const router = useRouter();

  return (
    <Popup opened={Boolean(product)} onBackdropClick={onClose}>
      {product && (
        <div className="rounded-t-3xl border-t border-black/5 bg-[#f8f8fb]/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-md dark:border-white/10 dark:bg-[#16171d]/95">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/20" />
          <p className="text-7 font-semibold text-foreground">{product.name}</p>
          <p className="mt-1 text-4 text-[#8e8e93]">SKU: {product.sku}</p>
          <p className="mt-2 text-6 font-semibold text-foreground">
            {formatPrice(product.price)}
          </p>
          {product.description && (
            <p className="mt-3 text-4 leading-6 text-[#8e8e93]">
              {product.description}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-2xl bg-black/5 px-4 py-3 text-4 font-medium text-foreground active:scale-[0.98] dark:bg-white/10"
              onClick={onCopySku}
            >
              Copy SKU
            </button>
            <button
              type="button"
              className="rounded-2xl bg-black/5 px-4 py-3 text-4 font-medium text-foreground active:scale-[0.98] dark:bg-white/10"
              onClick={onCopyName}
            >
              Copy Name
            </button>
          </div>
          <Button
            className="mt-3"
            tonal
            large
            rounded
            onClick={() => {
              const id = product.id;
              onClose();
              router.push(`/products/${id}`);
            }}
          >
            Edit Product
          </Button>
          <p className="mt-3 min-h-5 text-center text-3 text-[#8e8e93]">
            {notice ?? " "}
          </p>
          <Button className="mt-3" large rounded onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Popup>
  );
}

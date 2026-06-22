"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <Popup
        opened={Boolean(product)}
        onBackdropClick={onClose}
        onClick={onClose}
        className="bg-transparent"
      >
        {product && (
          <div className="flex h-full w-full items-start justify-center px-4 pt-[max(4.5rem,env(safe-area-inset-top))]">
            <div
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
        )}
      </Popup>

      {product && (
        <Actions
          opened
          backdrop={false}
          onBackdropClick={onClose}
          className="bottom-auto! top-[calc(max(4.5rem,env(safe-area-inset-top))+19.5rem)]! w-[calc(100%-2rem)]! max-w-lg! px-0! pb-0! pt-0!"
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

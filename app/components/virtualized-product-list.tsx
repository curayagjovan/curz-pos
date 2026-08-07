"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import List from "@mui/material/List";
import ProductCard from "@/app/components/product-card";
import { usePageContext } from "@/app/context/page-context";
import { useScrollMargin } from "@/app/hooks/use-scroll-margin";
import type { Product } from "@/types/product";

const ESTIMATED_ROW_HEIGHT = 96;
const OVERSCAN = 6;

type VirtualizedProductListProps = {
  products: Product[];
  onAddToCart: (product: Product, sourceRect?: DOMRect) => void;
  onQuickAddBundle?: (product: Product, quantity: number) => void;
  onRequestDelete?: (product: Product) => void;
  onTogglePin?: (product: Product) => void;
  deletingProductId: string | null;
  variant: "catalog" | "inventory";
};

export default function VirtualizedProductList({
  products,
  onAddToCart,
  onQuickAddBundle,
  onRequestDelete,
  onTogglePin,
  deletingProductId,
  variant,
}: VirtualizedProductListProps) {
  const { scrollContainerRef } = usePageContext();
  const anchorRef = useRef<HTMLUListElement | null>(null);
  const scrollMargin = useScrollMargin(scrollContainerRef, anchorRef);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    scrollMargin,
    getItemKey: (index) => products[index].id,
  });

  return (
    <List
      disablePadding
      ref={anchorRef}
      sx={{ position: "relative", height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const product = products[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onQuickAddBundle={onQuickAddBundle}
              onRequestDelete={onRequestDelete}
              onTogglePin={onTogglePin}
              deleteDisabled={deletingProductId === product.id}
              variant={variant}
            />
          </div>
        );
      })}
    </List>
  );
}

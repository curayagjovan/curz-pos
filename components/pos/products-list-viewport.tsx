import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Col } from "antd";
import { ProductRow, type Product } from "@/components/pos/product-row";

type ProductsListViewportProps = {
  mode: "light" | "dark";
  hasMoreProducts: boolean;
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  onRequestNextPage: () => void;
};

export function ProductsListViewport({
  mode,
  hasMoreProducts,
  products,
  onAddToCart,
  onRequestNextPage,
}: ProductsListViewportProps) {
  const INITIAL_VISIBLE_ITEMS = 12;
  const LOAD_MORE_STEP = 10;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);

  useEffect(() => {
    setVisibleCount((current) => {
      if (products.length === 0) {
        return INITIAL_VISIBLE_ITEMS;
      }

      return Math.min(
        Math.max(current, INITIAL_VISIBLE_ITEMS),
        products.length,
      );
    });
  }, [products.length]);

  const revealMoreItems = useCallback(() => {
    setVisibleCount((current) =>
      Math.min(current + LOAD_MORE_STEP, products.length),
    );
  }, [products.length]);

  const requestMoreFromApi = useCallback(() => {
    if (!hasMoreProducts) {
      return;
    }

    onRequestNextPage();
  }, [hasMoreProducts, onRequestNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }

        revealMoreItems();
        requestMoreFromApi();
      },
      {
        root: null,
        rootMargin: "280px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [revealMoreItems, requestMoreFromApi]);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount],
  );

  return (
    <Col xs={24}>
      <div
        style={{
          width: "100%",
          borderRadius: 14,
          border:
            mode === "dark"
              ? "1px solid rgba(51, 65, 85, 0.9)"
              : "1px solid rgba(214, 225, 241, 0.95)",
          background:
            mode === "dark"
              ? "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(15,23,42,0.52))"
              : "linear-gradient(180deg, rgba(250,252,255,0.9), rgba(242,247,255,0.9))",
          padding: 10,
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {visibleProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
      </div>
    </Col>
  );
}

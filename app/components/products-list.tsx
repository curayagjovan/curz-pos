"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { InfiniteScroll, List, Empty, DotLoading } from "antd-mobile";

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty?: number | string;
  bundlePrice?: number | string;
  stock: number | string;
};

const InfiniteScrollContent = ({ hasMore }: { hasMore?: boolean }) => {
  return (
    <>
      {hasMore ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1.5rem",
          }}
        >
          <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Loading
          </span>
          <DotLoading />
        </div>
      ) : (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.875rem",
          }}
        >
          --- No more products ---
        </div>
      )}
    </>
  );
};

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const initializedRef = useRef(false);
  const pageSize = 18;

  const fetchProducts = useCallback(
    async (skipValue: number): Promise<void> => {
      try {
        const response = await fetch(
          `/api/products?skip=${skipValue}&limit=${pageSize}`,
        );
        const data = await response.json();

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = data.items.filter(
            (item: Product) => !existingIds.has(item.id),
          );
          return [...prev, ...newItems];
        });
        setHasMore(data.hasMore);
        setSkip(skipValue + pageSize);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchProducts(0);
    }
  }, []);

  const loadMore = async () => {
    await fetchProducts(skip);
  };

  if (products.length === 0 && !hasMore) {
    return <Empty description="No products found" />;
  }

  return (
    <div className="products-list" style={{ paddingTop: "5rem" }}>
      <List>
        {products.map((product) => (
          <List.Item
            key={product.id}
            description={
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                <div>SKU: {product.sku}</div>
                <div>Stock: {Number(product.stock)}</div>
                <div>Price: ₱{Number(product.price).toFixed(2)}</div>
              </div>
            }
          >
            {product.name}
          </List.Item>
        ))}
      </List>

      <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
        <InfiniteScrollContent hasMore={hasMore} />
      </InfiniteScroll>
    </div>
  );
}

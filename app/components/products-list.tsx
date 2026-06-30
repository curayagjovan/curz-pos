"use client";

import { useState, useEffect, useRef } from "react";
import { InfiniteScroll, List, Empty, DotLoading } from "antd-mobile";
import {
  getProducts,
  saveProducts,
  shouldRefresh,
  type Product,
} from "@/lib/products-db";

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

  const fetchFromAPI = async (skipValue: number): Promise<void> => {
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
        const updated = [...prev, ...newItems];
        // Save to IndexedDB when we fetch
        if (skipValue === 0) {
          saveProducts(updated).catch(console.error);
        }
        return updated;
      });
      setHasMore(data.hasMore);
      setSkip(skipValue + pageSize);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const refreshFromAPI = async () => {
    try {
      const response = await fetch("/api/products?skip=0&limit=9999");
      const data = await response.json();
      setProducts(data.items);
      setSkip(data.items.length);
      setHasMore(data.hasMore);
      // Save to IndexedDB
      await saveProducts(data.items);
    } catch (error) {
      console.error("Failed to refresh products:", error);
    }
  };

  const loadCachedProducts = async () => {
    try {
      const cachedProducts = await getProducts();
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
        // Check if we should refresh in the background
        if (shouldRefresh()) {
          refreshFromAPI();
        }
      } else {
        // No cache, fetch immediately
        await fetchFromAPI(0);
      }
    } catch (error) {
      console.error("Failed to load cached products:", error);
      // Fall back to API fetch
      await fetchFromAPI(0);
    }
  };

  // Load cached products on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadCachedProducts();
    }
  }, []);

  const loadMore = async () => {
    await fetchFromAPI(skip);
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

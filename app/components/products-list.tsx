"use client";

import { useState, useEffect, useRef } from "react";
import { InfiniteScroll, List, Empty, DotLoading } from "antd-mobile";
import {
  getProducts,
  saveProducts,
  shouldRefresh,
  type Product,
} from "@/lib/products-db";
import { usePageContext } from "@/app/context/page-context";

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
  const { searchQuery } = usePageContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const initializedRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 18;

  // Debounced API search
  useEffect(() => {
    if (!initializedRef.current) return;

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery.trim()) {
      // Reset to cached/paginated list
      loadCachedProducts();
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(searchQuery)}&skip=0&limit=60`,
        );
        const data = await response.json();
        setProducts(data.items ?? []);
        setHasMore(false);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

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
        setHasMore(false);
        if (shouldRefresh()) {
          refreshFromAPI();
        }
      } else {
        await fetchFromAPI(0);
      }
    } catch (error) {
      console.error("Failed to load cached products:", error);
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

  if (products.length === 0 && !hasMore && !searchQuery && !isSearching) {
    return <Empty description="No products found" />;
  }

  if (isSearching) {
    return (
      <div
        style={{
          paddingTop: "6.5rem",
          paddingBottom: "5rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
          padding: "2rem",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Searching
        </span>
        <DotLoading />
      </div>
    );
  }

  if (products.length === 0 && searchQuery && !isSearching) {
    return (
      <div style={{ paddingTop: "6.5rem", paddingBottom: "5rem" }}>
        <Empty description={`No results for "${searchQuery}"`} />
      </div>
    );
  }

  return (
    <div
      className="products-list"
      style={{ paddingTop: "6.5rem", paddingBottom: "5rem" }}
    >
      <List>
        {products.map((product) => (
          <List.Item
            key={product.id}
            description={
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                <div>Price: ₱{Number(product.price).toFixed(2)}</div>
              </div>
            }
          >
            {product.name}
          </List.Item>
        ))}
      </List>

      {!searchQuery && (
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
          <InfiniteScrollContent hasMore={hasMore} />
        </InfiniteScroll>
      )}
    </div>
  );
}

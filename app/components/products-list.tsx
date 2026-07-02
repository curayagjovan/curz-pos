"use client";
"use no memo";

import { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Empty, DotLoading, SearchBar, PullToRefresh } from "antd-mobile";
import {
  getProducts,
  saveProducts,
  shouldRefresh,
  type Product,
} from "@/lib/products-db";
import { usePageContext } from "@/app/context/page-context";

export default function ProductsList() {
  const { searchQuery, setSearchQuery } = usePageContext();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const displayedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [searchQuery, allProducts]);

  const virtualizer = useVirtualizer({
    count: displayedProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });

  // Load all products on mount
  useEffect(() => {
    const load = async () => {
      try {
        const cached = await getProducts();
        if (cached.length > 0) {
          setAllProducts(cached);
          setIsLoading(false);
          if (shouldRefresh()) refreshAll();
        } else {
          await refreshAll();
        }
      } catch {
        await refreshAll();
      }
    };
    load();
  }, []);

  const refreshAll = async () => {
    try {
      const response = await fetch("/api/products?skip=0&limit=9999");
      const data = await response.json();
      const items: Product[] = data.items ?? data;
      setAllProducts(items);
      saveProducts(items).catch(console.error);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sticky search bar */}
      <div
        style={{
          padding: "0.5rem 0.75rem",
          flexShrink: 0,
          background: "var(--background)",
        }}
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products"
        />
      </div>

      {/* Scroll container for virtualizer */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div
          ref={parentRef}
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch" as const,
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                padding: "2rem",
              }}
            >
              <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                Loading
              </span>
              <DotLoading />
            </div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <Empty
                description={
                  searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No products found"
                }
              />
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const product = displayedProducts[virtualRow.index];
                return (
                  <div
                    key={product.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      borderBottom: "1px solid var(--border)",
                      padding: "0.75rem 1rem",
                      background: "var(--background)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        color: "var(--foreground)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{ fontSize: "0.8125rem", color: "var(--muted)" }}
                    >
                      {product.sku} · ₱{Number(product.price).toFixed(2)} ·
                      Stock: {Number(product.stock)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

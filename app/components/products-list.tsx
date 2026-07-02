"use client";
"use no memo";

import { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DotLoading,
  SearchBar,
  PullToRefresh,
  ErrorBlock,
  List,
} from "antd-mobile";
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
        console.log("Cached products:", cached.length);
        if (cached.length > 0) {
          setAllProducts(cached);
          setIsLoading(false);
          if (shouldRefresh()) {
            console.log("Cache expired, refreshing...");
            refreshAll();
          }
        } else {
          console.log("No cache, fetching from API...");
          await refreshAll();
        }
      } catch {
        console.log("Error loading cache, fetching from API...");
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
      console.log("Loaded products:", items.length, "items");
      setAllProducts(items);
      saveProducts(items).catch(console.error);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await refreshAll();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        width: "100%",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products"
        />
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div
          ref={parentRef}
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            overflowY: "auto",
            paddingBottom: "calc(56px + env(safe-area-inset-bottom))",
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
            <ErrorBlock
              status="empty"
              title="No products found"
              description={
                searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Try refreshing"
              }
            />
          ) : (
            <List>
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const product = displayedProducts[virtualRow.index];
                  return (
                    <List.Item
                      key={product.id}
                      description={`${product.sku} · Stock: ${Number(product.stock)}`}
                      extra={`₱${Number(product.price).toFixed(2)}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {product.name}
                    </List.Item>
                  );
                })}
              </div>
            </List>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

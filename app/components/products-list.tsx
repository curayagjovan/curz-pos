"use client";
"use no memo";

import { useState, useEffect, useMemo } from "react";
import {
  DotLoading,
  SearchBar,
  PullToRefresh,
  ErrorBlock,
  List,
  FloatingBubble,
} from "antd-mobile";
import { MessageFill } from "antd-mobile-icons";
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

  const displayedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [searchQuery, allProducts]);

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
      <div style={{ flexShrink: 0, padding: "1rem 1.5rem" }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products"
          clearable
          style={{
            "--height": "32px",
          }}
        />
      </div>

      <PullToRefresh
        refreshingText="Refreshing..."
        pullingText="Pull to refresh"
        canReleaseText="Release to refresh"
        completeText="Refresh complete"
        onRefresh={handleRefresh}
      >
        <div
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
              {displayedProducts.map((product) => (
                <List.Item
                  key={product.id}
                  description={`${product.sku} · Stock: ${Number(product.stock)}`}
                  extra={`₱${Number(product.price).toFixed(2)}`}
                >
                  {product.name}
                </List.Item>
              ))}
            </List>
          )}
        </div>
      </PullToRefresh>
      <FloatingBubble
        axis="x"
        magnetic="x"
        style={{
          "--initial-position-bottom": "24px",
          "--initial-position-right": "24px",
          "--edge-distance": "24px",
        }}
      >
        <MessageFill fontSize={32} />
      </FloatingBubble>
    </div>
  );
}

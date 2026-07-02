"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const initializedRef = useRef(false);
  const pageSize = 18;

  // Filter products from cache when search query changes
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [searchQuery, allProducts, products]);

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
          setAllProducts(updated);
        } else {
          setAllProducts((prevAll) => {
            const allIds = new Set(prevAll.map((p) => p.id));
            return [
              ...prevAll,
              ...newItems.filter((item: Product) => !allIds.has(item.id)),
            ];
          });
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
      setAllProducts(data.items);
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
        setAllProducts(cachedProducts);
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

  if (filteredProducts.length === 0 && !hasMore && !searchQuery) {
    return <Empty description="No products found" />;
  }

  if (filteredProducts.length === 0 && searchQuery) {
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
        {filteredProducts.map((product) => (
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { List, ListItem } from "konsta/react";
import PageContainer from "../components/page-container";

type ProductListItem = {
  id: string;
  name: string;
  price: number | string;
  sku: string;
  description?: string;
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatPrice(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return "-";
  }

  return CURRENCY_FORMATTER.format(parsed);
}

const ITEMS_PER_PAGE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;

  const refreshProducts = async () => {
    try {
      setIsRefreshingProducts(true);
      setProductsError(null);
      setOffset(0);
      setHasMore(true);

      const response = await fetch(
        `/api/products?skip=0&limit=${ITEMS_PER_PAGE}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error("Failed to load products");

      const data = (await response.json()) as {
        items: ProductListItem[];
        total: number;
        hasMore: boolean;
      };
      if (data.items && Array.isArray(data.items)) {
        setProducts(data.items);
        setTotalProducts(data.total);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Unable to load products", error);
      setProductsError("Unable to load products");
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setIsRefreshingProducts(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const newOffset = offset + ITEMS_PER_PAGE;

      const response = await fetch(
        `/api/products?skip=${newOffset}&limit=${ITEMS_PER_PAGE}`,
        { cache: "no-store" },
      );

      if (!response.ok) throw new Error("Failed to load more products");

      const data = (await response.json()) as {
        items: ProductListItem[];
        total: number;
        hasMore: boolean;
      };
      if (data.items && Array.isArray(data.items)) {
        setProducts((prev) => [...prev, ...data.items]);
        setOffset(newOffset);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Unable to load more products", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, hasMore, isLoadingMore]);

  useEffect(() => {
    const controller = new AbortController();

    const initialLoad = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch(
          `/api/products?skip=0&limit=${ITEMS_PER_PAGE}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) throw new Error("Failed to load products");

        const data = (await response.json()) as {
          items: ProductListItem[];
          total: number;
          hasMore: boolean;
        };
        if (data.items && Array.isArray(data.items)) {
          setProducts(data.items);
          setTotalProducts(data.total);
          setHasMore(data.hasMore);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Unable to load products", error);
          setProductsError("Unable to load products");
          setProducts([]);
          setTotalProducts(0);
        }
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void initialLoad();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          void loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore]);

  return (
    <PageContainer
      subtitle={`${totalProducts} Products`}
      onSearch={setSearchQuery}
      onRefresh={refreshProducts}
      isRefreshing={isRefreshingProducts}
      isLoading={isLoadingProducts || isLoadingMore}
    >
      {/* // isLoadingProducts
      //   ? "Loading products..."
      //   : `${filteredProducts.length} Products` */}
      <List strongIos inset>
        {/* {isLoadingProducts && (
          <div
            className="pointer-events-none sticky top-[max(16px,var(--k-safe-area-top))] z-20 flex justify-center"
            style={{
              transition: "opacity 180ms ease, transform 180ms ease",
            }}
          >
            <div className="rounded-full  px-3 py-2 shadow-sm backdrop-blur-sm ">
              <Preloader className="scale-75" />
            </div>
          </div>
        )} */}

        {!isLoadingProducts && productsError && (
          <ListItem title={productsError} />
        )}

        {!isLoadingProducts && !productsError && products.length === 0 && (
          <ListItem title="No products yet" />
        )}

        {!isLoadingProducts &&
          !productsError &&
          products.length > 0 &&
          filteredProducts.length === 0 && (
            <ListItem title="No products match your search" />
          )}

        {!isLoadingProducts &&
          !productsError &&
          filteredProducts.map((product) => (
            <ListItem
              key={product.id}
              media={
                <div className="flex size-9 items-center justify-center rounded-xl bg-black/5 text-3 font-semibold text-(--muted) dark:bg-white/10">
                  {product.sku.slice(0, 2).toUpperCase()}
                </div>
              }
              title={product.name}
              text={product.sku}
              after={formatPrice(product.price)}
            />
          ))}

        {/* Sentinel element for infinite scroll */}
        <div ref={sentinelRef} className="py-4" />

        {isLoadingMore && <ListItem title="Loading more products..." />}
      </List>
    </PageContainer>
  );
}

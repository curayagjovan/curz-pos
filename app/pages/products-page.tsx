"use client";

import { MapPinIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { List, ListItem } from "konsta/react";
import ProductQuickViewPopup from "../components/product-quick-view-popup";
import PageContainer from "../components/page-container";
import { type ProductListItem } from "../types";

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
const LONG_PRESS_DURATION_MS = 320;

type ProductsResponseShape =
  | {
      items?: ProductListItem[];
      total?: number;
      hasMore?: boolean;
    }
  | ProductListItem[];

function normalizeProductsResponse(data: ProductsResponseShape) {
  if (Array.isArray(data)) {
    return {
      items: data,
      hasMore: data.length === ITEMS_PER_PAGE,
      total: null as number | null,
    };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items,
    hasMore:
      typeof data.hasMore === "boolean"
        ? data.hasMore
        : items.length === ITEMS_PER_PAGE,
    total: typeof data.total === "number" ? data.total : null,
  };
}

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
  const [quickViewProduct, setQuickViewProduct] =
    useState<ProductListItem | null>(null);
  const [pressedProductId, setPressedProductId] = useState<string | null>(null);
  const [pulsingProductId, setPulsingProductId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pressedElementRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;
  const pinnedProducts = filteredProducts.filter((product) => product.isPinned);
  const otherProducts = filteredProducts.filter((product) => !product.isPinned);
  const isEmptyProductsState =
    !isLoadingProducts && !productsError && products.length === 0;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressedProductId(null);
  }, []);

  const startLongPress = useCallback(
    (product: ProductListItem, event: React.TouchEvent | React.MouseEvent) => {
      clearLongPressTimer();
      setPressedProductId(product.id);
      pressedElementRef.current = event.currentTarget as HTMLElement;
      longPressTimerRef.current = setTimeout(() => {
        setPulsingProductId(product.id);
        if (pulseTimerRef.current) {
          clearTimeout(pulseTimerRef.current);
        }
        pulseTimerRef.current = setTimeout(() => {
          setPulsingProductId(null);
          pulseTimerRef.current = null;
        }, 240);
        setQuickViewProduct(product);
        setPressedProductId(null);
        longPressTimerRef.current = null;
      }, LONG_PRESS_DURATION_MS);
    },
    [clearLongPressTimer],
  );

  const handlePinProduct = useCallback(
    async (productId: string, isPinned: boolean) => {
      const nextIsPinned = !isPinned;

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? { ...product, isPinned: nextIsPinned }
            : product,
        ),
      );

      try {
        const response = await fetch(`/api/products/${productId}/pin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: nextIsPinned }),
        });

        if (!response.ok) {
          throw new Error("Failed to pin product");
        }

        const updatedProduct = (await response.json()) as {
          id: string;
          isPinned: boolean;
        };

        setProducts((prev) =>
          prev.map((product) =>
            product.id === updatedProduct.id
              ? { ...product, isPinned: updatedProduct.isPinned }
              : product,
          ),
        );
      } catch (error) {
        console.error("Unable to update pinned product", error);
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? { ...product, isPinned }
              : product,
          ),
        );
      }
    },
    [],
  );

  const refreshProducts = useCallback(async () => {
    try {
      setIsRefreshingProducts(true);
      setProductsError(null);
      setOffset(0);
      setHasMore(true);

      const response = await fetch(
        `/api/products?skip=0&limit=${ITEMS_PER_PAGE}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = (await response.json()) as ProductsResponseShape;
      const normalized = normalizeProductsResponse(data);
      setProducts(normalized.items);
      setTotalProducts(normalized.total ?? normalized.items.length);
      setHasMore(normalized.hasMore);
    } catch (error) {
      console.error("Unable to load products", error);
      if (products.length === 0) {
        setProductsError("Unable to load products");
        setProducts([]);
        setTotalProducts(0);
      }
    } finally {
      setIsRefreshingProducts(false);
    }
  }, [products.length]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const newOffset = offset + ITEMS_PER_PAGE;

      const response = await fetch(
        `/api/products?skip=${newOffset}&limit=${ITEMS_PER_PAGE}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to load more products");
      }

      const data = (await response.json()) as ProductsResponseShape;
      const normalized = normalizeProductsResponse(data);

      if (normalized.items.length > 0) {
        setProducts((prev) => [...prev, ...normalized.items]);
        setOffset(newOffset);
      }

      setHasMore(normalized.hasMore);
      if (normalized.total !== null) {
        setTotalProducts(normalized.total);
      }
    } catch (error) {
      console.error("Unable to load more products", error);
      // Stop repeated observer-triggered retries after a failed page load.
      setHasMore(false);
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

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = (await response.json()) as ProductsResponseShape;
        const normalized = normalizeProductsResponse(data);
        setProducts(normalized.items);
        setTotalProducts(normalized.total ?? normalized.items.length);
        setHasMore(normalized.hasMore);
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
    if (!sentinelRef.current) {
      return;
    }

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

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
    };
  }, [clearLongPressTimer]);

  return (
    <PageContainer
      subtitle={`${totalProducts} Products`}
      onSearch={setSearchQuery}
      onRefresh={refreshProducts}
      isRefreshing={isRefreshingProducts}
      isLoading={isLoadingProducts || isLoadingMore}
    >
      {isEmptyProductsState ? (
        <div className="flex min-h-[calc(100svh-16rem)] flex-col items-center justify-center px-6 pb-24 text-center">
          <ShoppingBagIcon className="mb-4 size-14 text-[#8e8e93]" />
          <p className="text-[36px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
            No Products
          </p>
        </div>
      ) : (
        <List strongIos inset>
          {!isLoadingProducts && productsError && (
            <ListItem title={productsError} />
          )}

          {!isLoadingProducts &&
            !productsError &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <ListItem title="No products match your search" />
            )}

          {!isLoadingProducts && !productsError && pinnedProducts.length > 0 && (
            <>
              <div className="px-4 py-3 text-xs font-semibold text-[#8e8e93]">
                PINNED
              </div>
              {pinnedProducts.map((product) => (
                <ListItem
                  key={product.id}
                  className={
                    [
                      pressedProductId === product.id
                        ? "bg-black/5 dark:bg-white/10"
                        : "",
                      pulsingProductId === product.id
                        ? "animate-[pulse_240ms_ease-out_1]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  onTouchStart={(event) => startLongPress(product, event)}
                  onTouchEnd={clearLongPressTimer}
                  onTouchCancel={clearLongPressTimer}
                  onTouchMove={clearLongPressTimer}
                  onMouseDown={(event) => startLongPress(product, event)}
                  onMouseUp={clearLongPressTimer}
                  onMouseLeave={clearLongPressTimer}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    clearLongPressTimer();
                    setQuickViewProduct(product);
                  }}
                  media={
                    <div className="relative flex size-9 items-center justify-center rounded-xl bg-black/5 text-3 font-semibold text-(--muted) dark:bg-white/10">
                      {product.sku.slice(0, 2).toUpperCase()}
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#0a84ff] text-white">
                        <MapPinIcon className="size-2.5" />
                      </span>
                    </div>
                  }
                  title={product.name}
                  text={product.sku}
                  after={formatPrice(product.price)}
                />
              ))}
            </>
          )}

          {!isLoadingProducts && !productsError && otherProducts.length > 0 && (
            <>
              {pinnedProducts.length > 0 && (
                <div className="px-4 py-3 text-xs font-semibold text-[#8e8e93]">
                  ALL PRODUCTS
                </div>
              )}
              {otherProducts.map((product) => (
                <ListItem
                  key={product.id}
                  className={
                    [
                      pressedProductId === product.id
                        ? "bg-black/5 dark:bg-white/10"
                        : "",
                      pulsingProductId === product.id
                        ? "animate-[pulse_240ms_ease-out_1]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  onTouchStart={(event) => startLongPress(product, event)}
                  onTouchEnd={clearLongPressTimer}
                  onTouchCancel={clearLongPressTimer}
                  onTouchMove={clearLongPressTimer}
                  onMouseDown={(event) => startLongPress(product, event)}
                  onMouseUp={clearLongPressTimer}
                  onMouseLeave={clearLongPressTimer}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    clearLongPressTimer();
                    setQuickViewProduct(product);
                  }}
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
            </>
          )}

          <div ref={sentinelRef} className="py-4" />
        </List>
      )}

      <ProductQuickViewPopup
        product={quickViewProduct}
        pressTarget={pressedElementRef}
        notice={null}
        onPinProduct={handlePinProduct}
        onClose={() => {
          setQuickViewProduct(null);
        }}
        formatPrice={formatPrice}
      />
    </PageContainer>
  );
}

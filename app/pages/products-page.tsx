"use client";

import { MapPinIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { List, ListItem } from "konsta/react";
import ProductQuickViewPopup from "../components/product-quick-view-popup";
import CheckoutActionSheet from "@/app/components/checkout-action-sheet";
import PageContainer from "../components/page-container";
import { type ProductListItem } from "../types";
import { computeTax } from "@/lib/tax-config";

const SCROLL_POSITION_KEY = "products-page-scroll-position";

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
const PRODUCTS_FETCH_RETRIES = 2;
const LOAD_MORE_RETRY_COOLDOWN_MS = 4000;
const INITIAL_LOAD_MAX_ATTEMPTS = 4;
const INITIAL_LOAD_RETRY_BASE_DELAY_MS = 700;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

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

async function fetchProductsPage(
  url: string,
  options?: { signal?: AbortSignal; retries?: number },
) {
  const retries = options?.retries ?? PRODUCTS_FETCH_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = (await response.json()) as ProductsResponseShape;
      return normalizeProductsResponse(data);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw error;
      }

      if (attempt === retries) {
        throw error;
      }

      await wait(300 * (attempt + 1));
    }
  }

  throw new Error("Failed to load products");
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [pressedProductId, setPressedProductId] = useState<string | null>(null);
  const [pulsingProductId, setPulsingProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pressedElementRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRetryBlockedUntilRef = useRef(0);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextClickRef = useRef(false);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const checkoutItems = useMemo(
    () =>
      Array.from(cart.entries())
        .map(([productId, quantity]) => {
          const product = productById.get(productId);
          if (!product || quantity <= 0) {
            return null;
          }

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            unitPrice: Number(product.price) || 0,
            quantity,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [cart, productById],
  );

  const checkoutSubtotal = useMemo(
    () =>
      Number(
        checkoutItems
          .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
          .toFixed(2),
      ),
    [checkoutItems],
  );
  const checkoutTax = useMemo(
    () => computeTax(checkoutSubtotal),
    [checkoutSubtotal],
  );
  const checkoutTotal = useMemo(
    () => Number((checkoutSubtotal + checkoutTax).toFixed(2)),
    [checkoutSubtotal, checkoutTax],
  );

  const paymentAmount = useMemo(() => {
    const parsed = Number(paymentAmountInput);
    if (
      paymentAmountInput.trim() === "" ||
      Number.isNaN(parsed) ||
      parsed < 0
    ) {
      return 0;
    }

    return Number(parsed.toFixed(2));
  }, [paymentAmountInput]);

  const changeAmount = useMemo(
    () => Number(Math.max(0, paymentAmount - checkoutTotal).toFixed(2)),
    [paymentAmount, checkoutTotal],
  );

  const quickAmounts = useMemo(() => {
    const roundedToNearestTen = Math.ceil(checkoutTotal / 10) * 10;
    const roundedToNearestFifty = Math.ceil(checkoutTotal / 50) * 50;
    const roundedToNearestHundred = Math.ceil(checkoutTotal / 100) * 100;
    const base = [
      checkoutTotal,
      roundedToNearestTen,
      roundedToNearestFifty,
      roundedToNearestHundred,
    ]
      .filter((amount) => amount > 0)
      .map((amount) => Number(amount.toFixed(2)));

    return Array.from(new Set(base)).sort((a, b) => a - b);
  }, [checkoutTotal]);

  const cartCount = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
    [checkoutItems],
  );

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

  const addToCart = useCallback(
    (productId: string) => {
      // Don't add to cart if navigation is in progress, quickview is open, or we just opened quickview
      if (
        isNavigating ||
        skipNextClickRef.current ||
        quickViewProduct?.id === productId
      ) {
        console.log("Skipping cart add", {
          productId,
          isNavigating,
          skipNext: skipNextClickRef.current,
          quickViewProductId: quickViewProduct?.id,
        });
        return;
      }

      console.log("Adding to cart", productId);
      setCart((prev) => {
        const newCart = new Map(prev);
        const currentQty = newCart.get(productId) ?? 0;
        newCart.set(productId, currentQty + 1);
        return newCart;
      });
      setCheckoutError(null);
    },
    [quickViewProduct, isNavigating],
  );

  const decrementCartItem = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const currentQty = next.get(productId) ?? 0;

      if (currentQty <= 1) {
        next.delete(productId);
      } else {
        next.set(productId, currentQty - 1);
      }

      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(new Map());
    setPaymentAmountInput("");
    setCheckoutError(null);
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
            product.id === productId ? { ...product, isPinned } : product,
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

      const normalized = await fetchProductsPage(
        `/api/products?skip=0&limit=${ITEMS_PER_PAGE}`,
      );
      setProducts(normalized.items);
      setTotalProducts(normalized.total ?? normalized.items.length);
      setHasMore(normalized.hasMore);
      loadMoreRetryBlockedUntilRef.current = 0;
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

  const submitCheckout = useCallback(async () => {
    if (checkoutItems.length === 0 || isSubmittingCheckout) {
      return;
    }

    if (paymentAmount < checkoutTotal) {
      setCheckoutError("Payment amount is not enough.");
      return;
    }

    setIsSubmittingCheckout(true);
    setCheckoutError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          note: `Paid ${formatPrice(paymentAmount)} | Change ${formatPrice(changeAmount)}`,
          items: checkoutItems.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(errorBody?.message || "Unable to checkout");
      }

      setCart(new Map());
      setPaymentAmountInput("");
      setIsCheckoutOpen(false);
      await refreshProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to checkout";
      setCheckoutError(message);
    } finally {
      setIsSubmittingCheckout(false);
    }
  }, [
    changeAmount,
    checkoutItems,
    checkoutTotal,
    isSubmittingCheckout,
    paymentAmount,
    refreshProducts,
  ]);

  const handlePaymentAmountInputChange = useCallback((value: string) => {
    setCheckoutError(null);
    setPaymentAmountInput(value);
  }, []);

  const handleQuickAmountSelect = useCallback((value: number) => {
    setCheckoutError(null);
    setPaymentAmountInput(value.toFixed(2));
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    if (Date.now() < loadMoreRetryBlockedUntilRef.current) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const newOffset = offset + ITEMS_PER_PAGE;

      const normalized = await fetchProductsPage(
        `/api/products?skip=${newOffset}&limit=${ITEMS_PER_PAGE}`,
      );

      if (normalized.items.length > 0) {
        setProducts((prev) => [...prev, ...normalized.items]);
        setOffset(newOffset);
      }

      setHasMore(normalized.hasMore);
      if (normalized.total !== null) {
        setTotalProducts(normalized.total);
      }
      loadMoreRetryBlockedUntilRef.current = 0;
    } catch (error) {
      console.error("Unable to load more products", error);
      // Prevent rapid observer-triggered retry loops after transient failures.
      loadMoreRetryBlockedUntilRef.current =
        Date.now() + LOAD_MORE_RETRY_COOLDOWN_MS;
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, hasMore, isLoadingMore]);

  useEffect(() => {
    const controller = new AbortController();

    const initialLoad = async () => {
      let didLoad = false;

      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        for (
          let attempt = 0;
          attempt < INITIAL_LOAD_MAX_ATTEMPTS;
          attempt += 1
        ) {
          try {
            const normalized = await fetchProductsPage(
              `/api/products?skip=0&limit=${ITEMS_PER_PAGE}`,
              {
                signal: controller.signal,
              },
            );

            setProducts(normalized.items);
            setTotalProducts(normalized.total ?? normalized.items.length);
            setHasMore(normalized.hasMore);
            loadMoreRetryBlockedUntilRef.current = 0;
            didLoad = true;
            break;
          } catch (attemptError) {
            if ((attemptError as Error).name === "AbortError") {
              throw attemptError;
            }

            if (attempt === INITIAL_LOAD_MAX_ATTEMPTS - 1) {
              throw attemptError;
            }

            await wait(INITIAL_LOAD_RETRY_BASE_DELAY_MS * (attempt + 1));
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Unable to load products", error);
          setProductsError("Unable to load products");
          setProducts([]);
          setTotalProducts(0);
        }
      } finally {
        if (didLoad || !controller.signal.aborted) {
          setIsLoadingProducts(false);
        }
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

  // Prevent ListItem clicks when quickview is open
  useEffect(() => {
    if (quickViewProduct) {
      skipNextClickRef.current = true;
      // Clear the flag after quickview animation completes
      const timer = setTimeout(() => {
        skipNextClickRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quickViewProduct]);

  // Save scroll position to sessionStorage when navigating away
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollableElement =
        scrollableRef.current ||
        document.querySelector('[class*="k-page"]') ||
        document.documentElement;
      const scrollTop = scrollableElement?.scrollTop ?? window.scrollY;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollTop));
      }
    };

    // Save on beforeunload (page navigation/refresh)
    window.addEventListener("beforeunload", saveScrollPosition);

    // Also save periodically while scrolling
    const handleScroll = () => {
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
      scrollSaveTimerRef.current = setTimeout(() => {
        const scrollableElement =
          scrollableRef.current ||
          document.querySelector('[class*="k-page"]') ||
          document.documentElement;
        const scrollTop = scrollableElement?.scrollTop ?? window.scrollY;
        if (typeof window !== "undefined") {
          sessionStorage.setItem(SCROLL_POSITION_KEY, String(scrollTop));
        }
      }, 500);
    };

    const scrollableElement =
      scrollableRef.current || document.querySelector('[class*="k-page"]');
    scrollableElement?.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("beforeunload", saveScrollPosition);
      scrollableElement?.removeEventListener("scroll", handleScroll);
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
    };
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      if (typeof window === "undefined") return;

      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        const scrollPosition = parseInt(savedPosition, 10);
        const scrollableElement =
          scrollableRef.current ||
          document.querySelector('[class*="k-page"]') ||
          document.documentElement;

        if (scrollableElement && scrollPosition > 0) {
          scrollableElement.scrollTop = scrollPosition;
        }
      }
    });
  }, []);

  return (
    <PageContainer
      subtitle={`${totalProducts} Products`}
      cartCount={cartCount}
      onSearch={setSearchQuery}
      onCartClick={() => {
        setCheckoutError(null);
        if (!paymentAmountInput && checkoutTotal > 0) {
          setPaymentAmountInput(checkoutTotal.toFixed(2));
        }
        setIsCheckoutOpen(true);
      }}
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
        <List
          strongIos
          inset
          style={{
            pointerEvents: quickViewProduct || isNavigating ? "none" : "auto",
          }}
        >
          {!isLoadingProducts && productsError && (
            <ListItem title={productsError} />
          )}

          {!isLoadingProducts &&
            !productsError &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <ListItem title="No products match your search" />
            )}

          {!isLoadingProducts &&
            !productsError &&
            pinnedProducts.length > 0 && (
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
                    onClick={(e) => {
                      // Ignore clicks if quickview is open or we're navigating
                      if (quickViewProduct || isNavigating) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      addToCart(product.id);
                    }}
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
                  onClick={(e) => {
                    // Ignore clicks if quickview is open or we're navigating
                    if (quickViewProduct || isNavigating) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    addToCart(product.id);
                  }}
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
        onNavigating={setIsNavigating}
      />

      <CheckoutActionSheet
        open={isCheckoutOpen}
        items={checkoutItems}
        subtotal={checkoutSubtotal}
        tax={checkoutTax}
        total={checkoutTotal}
        paymentAmountInput={paymentAmountInput}
        paymentAmount={paymentAmount}
        changeAmount={changeAmount}
        quickAmounts={quickAmounts}
        isSubmitting={isSubmittingCheckout}
        errorMessage={checkoutError}
        onClose={() => setIsCheckoutOpen(false)}
        onIncrement={addToCart}
        onDecrement={decrementCartItem}
        onClearCart={clearCart}
        onPaymentAmountInputChange={handlePaymentAmountInputChange}
        onQuickAmountSelect={handleQuickAmountSelect}
        onCheckout={submitCheckout}
        formatPrice={formatPrice}
      />
    </PageContainer>
  );
}

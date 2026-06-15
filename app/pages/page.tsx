"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  FloatButton,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import {
  MoonOutlined,
  SunOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";
import { type BottomNavTabKey } from "@/app/components/navigation/bottom-nav";
import { computeTax } from "@/lib/tax-config";
import { useCompactHeight } from "@/app/hooks/use-compact-height";
import { PageWrapper } from "@/app/components/navigation/page-wrapper";
import { TransactionsTabContent } from "@/app/components/pos/transactions-tab-content";
import { ProductsTabContent } from "@/app/components/pos/products-tab-content";
import { CartTabContent } from "@/app/components/pos/cart-tab-content";
import { type Product } from "@/app/components/pos/product-row";
import { ProductViewDrawer } from "@/app/components/products/product-view-drawer";
import { ProductEditDrawer } from "@/app/components/products/product-edit-drawer";
import type {
  Transaction,
  TransactionFilter,
  TransactionCacheEntry,
} from "@/app/types";

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty: number | null;
  bundlePrice: number | string | null;
  stock: number;
};

type CartItem = Product & { quantity: number };

type ApiOrder = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number | string;
  note?: string | null;
  createdAt: string;
};

function getLineTotal(item: {
  quantity: number;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  if (
    item.bundleQty &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0
  ) {
    const bundles = Math.floor(item.quantity / item.bundleQty);
    const remainder = item.quantity % item.bundleQty;
    return Number(
      (bundles * item.bundlePrice + remainder * item.price).toFixed(2),
    );
  }

  return Number((item.quantity * item.price).toFixed(2));
}

const PAGE_SIZE = 18;

type ProductListCacheEntry = {
  items: Product[];
  hasMore: boolean;
  nextCursor: string | null;
  updatedAt: number;
};

const PRODUCT_CACHE_TTL_MS = 30_000;
const productListCache = new Map<string, ProductListCacheEntry>();
const TRANSACTION_CACHE_TTL_MS = 30_000;
const transactionCache = new Map<string, TransactionCacheEntry>();
const TRANSACTION_PAGE_SIZE = 10;
const PRODUCT_LOAD_RETRY_DELAYS_MS = [400, 900, 1600] as const;

function delayWithAbort(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Request aborted", "AbortError"));
    };

    if (!signal) {
      return;
    }

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isBottomNavTab(value: string | null): value is BottomNavTabKey {
  return (
    value === "products" ||
    value === "cart" ||
    value === "transactions" ||
    value === "settings"
  );
}

function isTransactionFilter(value: string | null): value is TransactionFilter {
  return value === "ALL" || value === "PAID" || value === "CANCELLED";
}

interface SettingsTabContentProps {
  mode: "light" | "dark";
}

function SettingsTabContent({ mode }: SettingsTabContentProps) {
  const { message } = App.useApp();
  const { setMode } = useThemeMode();
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [markupFilterType, setMarkupFilterType] = useState<
    "all" | "unit" | "category" | "productType"
  >("all");
  const [markupFilterValue, setMarkupFilterValue] = useState("");
  const [applyingMarkup, setApplyingMarkup] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load settings.");
        }

        const data = (await response.json()) as {
          globalMarkupPercent?: number;
          globalMarkupFilterType?: "all" | "unit" | "category" | "productType";
          globalMarkupFilterValue?: string;
        };

        setMarkupPercent(Number(data.globalMarkupPercent ?? 0));
        setMarkupFilterType(data.globalMarkupFilterType ?? "all");
        setMarkupFilterValue(data.globalMarkupFilterValue ?? "");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load settings.";
        message.error(errorMessage);
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [message]);

  const applyGlobalMarkup = async () => {
    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      message.error("Markup must be 0 or higher.");
      return;
    }

    if (markupFilterType !== "all" && !markupFilterValue.trim()) {
      message.error("Please provide a filter value.");
      return;
    }

    try {
      setApplyingMarkup(true);

      const saveResponse = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeMode: mode,
          globalMarkupPercent: markupPercent,
          globalMarkupFilterType: markupFilterType,
          globalMarkupFilterValue: markupFilterValue,
        }),
      });

      const saveData = (await saveResponse.json()) as { message?: string };
      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Failed to save settings.");
      }

      const response = await fetch("/api/products/markup-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markupPercent,
          filterType: markupFilterType,
          filterValue: markupFilterValue,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply markup.");
      }

      message.success(data.message || "Global markup updated.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to apply markup.";
      message.error(errorMessage);
    } finally {
      setApplyingMarkup(false);
    }
  };

  return (
    <Card
      style={{
        background:
          mode === "dark"
            ? "linear-gradient(135deg, rgba(20,31,55,0.9), rgba(15,23,42,0.8))"
            : undefined,
        border:
          mode === "dark" ? "1px solid rgba(71, 85, 105, 0.5)" : undefined,
      }}
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        {/* General Settings Section */}
        <div>
          <Typography.Title
            level={5}
            style={{
              margin: 0,
              marginBottom: 8,
              color: mode === "dark" ? "#f1f5f9" : undefined,
            }}
          >
            General Settings
          </Typography.Title>
          <Typography.Text
            type="secondary"
            style={{ color: mode === "dark" ? "#cbd5e1" : undefined }}
          >
            Configure application-wide preferences
          </Typography.Text>

          <Card
            size="small"
            style={{
              marginTop: 12,
              background:
                mode === "dark"
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(248, 250, 252, 0.9)",
              borderColor: mode === "dark" ? "#334155" : "#dbeafe",
            }}
          >
            <Space orientation="vertical" style={{ width: "100%" }} size={10}>
              <Typography.Text
                strong
                style={{ color: mode === "dark" ? "#e5e7eb" : "#0f172a" }}
              >
                Theme
              </Typography.Text>
              <Typography.Text type="secondary">
                Switch between light and dark appearance.
              </Typography.Text>

              <Row gutter={[10, 10]}>
                <Col xs={24} sm={12}>
                  <Button
                    size="large"
                    type={mode === "light" ? "primary" : "default"}
                    icon={<SunOutlined />}
                    onClick={() => setMode("light")}
                    block
                  >
                    Light Mode
                  </Button>
                </Col>
                <Col xs={24} sm={12}>
                  <Button
                    size="large"
                    type={mode === "dark" ? "primary" : "default"}
                    icon={<MoonOutlined />}
                    onClick={() => setMode("dark")}
                    block
                  >
                    Dark Mode
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
        </div>

        {/* Divider */}
        <Divider style={{ margin: "8px 0" }} />

        {/* Product Settings Section */}
        <div>
          <Typography.Title
            level={5}
            style={{
              margin: 0,
              marginBottom: 8,
              color: mode === "dark" ? "#f1f5f9" : undefined,
            }}
          >
            Product Settings
          </Typography.Title>
          <Typography.Text
            type="secondary"
            style={{ color: mode === "dark" ? "#cbd5e1" : undefined }}
          >
            Quickly manage your product catalog.
          </Typography.Text>

          <Space
            wrap
            style={{ marginTop: 12, display: "flex", gap: 8, width: "100%" }}
          >
            <Link href="/pages/products/add">
              <Button icon={<PlusOutlined />} type="default">
                Add Single Product
              </Button>
            </Link>
            <Link href="/pages/products/bulk-import">
              <Button icon={<UploadOutlined />}>Bulk Import</Button>
            </Link>
          </Space>

          {/* Global Markup Section */}
          <Card
            size="small"
            style={{
              marginTop: 12,
              background:
                mode === "dark"
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(248, 250, 252, 0.9)",
              borderColor: mode === "dark" ? "#334155" : "#dbeafe",
            }}
          >
            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
              <Typography.Title
                level={5}
                style={{
                  margin: 0,
                  color: mode === "dark" ? "#e5e7eb" : "#0f172a",
                }}
              >
                Global Markup Tool
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: "block" }}>
                Apply markup to all products, or filter by unit, category
                keyword, or product type keyword.
              </Typography.Text>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Markup (%)</Typography.Text>
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    precision={2}
                    value={markupPercent}
                    onChange={(value) => setMarkupPercent(value ?? 0)}
                    disabled={loadingSettings}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">
                    Filter Type
                  </Typography.Text>
                  <Select
                    style={{ width: "100%" }}
                    value={markupFilterType}
                    onChange={(value) => setMarkupFilterType(value)}
                    disabled={loadingSettings}
                    options={[
                      { label: "All Products", value: "all" },
                      { label: "Unit", value: "unit" },
                      { label: "Category Keyword", value: "category" },
                      { label: "Product Type Keyword", value: "productType" },
                    ]}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">
                    {markupFilterType === "unit"
                      ? "Unit"
                      : markupFilterType === "all"
                        ? "Filter Value (not needed)"
                        : "Keyword"}
                  </Typography.Text>
                  <Input
                    placeholder={
                      markupFilterType === "unit"
                        ? "e.g. PCS"
                        : markupFilterType === "all"
                          ? "Not required"
                          : "e.g. coffee"
                    }
                    value={markupFilterValue}
                    onChange={(event) =>
                      setMarkupFilterValue(event.target.value)
                    }
                    disabled={loadingSettings || markupFilterType === "all"}
                  />
                </Col>
              </Row>

              <Button
                type="primary"
                loading={applyingMarkup}
                disabled={loadingSettings}
                onClick={() => {
                  void applyGlobalMarkup();
                }}
                block
                style={{ marginTop: 16 }}
              >
                Apply Global Markup
              </Button>
            </Space>
          </Card>
        </div>
      </Space>
    </Card>
  );
}

export default function Home() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode } = useThemeMode();
  const isCompactHeight = useCompactHeight();
  const initialTab = searchParams.get("tab");
  const initialTransactionFilter = searchParams.get("txFilter");
  const initialTransactionPage = Number.parseInt(
    searchParams.get("txPage") ?? "1",
    10,
  );
  const safeInitialTransactionPage = Number.isNaN(initialTransactionPage)
    ? 1
    : Math.max(1, initialTransactionPage);
  const [activeTab, setActiveTab] = useState<BottomNavTabKey>(
    isBottomNavTab(initialTab) ? initialTab : "products",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(
    safeInitialTransactionPage,
  );
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>(
    isTransactionFilter(initialTransactionFilter)
      ? initialTransactionFilter
      : "ALL",
  );
  const latestProductsRef = useRef<Product[]>([]);
  const latestProductsRequestIdRef = useRef(0);
  const resetLoadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    latestProductsRef.current = products;
  }, [products]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(
    async ({ cursor, reset }: { cursor: string | null; reset: boolean }) => {
      const requestId = latestProductsRequestIdRef.current + 1;
      latestProductsRequestIdRef.current = requestId;

      const abortController = reset ? new AbortController() : null;
      if (reset) {
        resetLoadAbortRef.current?.abort();
        resetLoadAbortRef.current = abortController;
      }

      try {
        const cacheKey = debouncedSearch.toLowerCase();
        if (reset) {
          const cached = productListCache.get(cacheKey);
          if (cached && Date.now() - cached.updatedAt < PRODUCT_CACHE_TTL_MS) {
            if (requestId !== latestProductsRequestIdRef.current) {
              return;
            }

            setProducts(cached.items);
            setHasMoreProducts(cached.hasMore);
            setNextCursor(cached.nextCursor);
            setProductsLoadError(null);
            setLoadingProducts(false);
            return;
          }
        }

        if (reset) {
          setLoadingProducts(true);
        }

        if (!reset) {
          setLoadingMoreProducts(true);
        }

        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
        });
        if (cursor) {
          params.set("cursor", cursor);
        }
        if (debouncedSearch) {
          params.set("q", debouncedSearch);
        }

        let data: {
          items: ApiProduct[];
          hasMore: boolean;
          nextCursor: string | null;
        } | null = null;

        for (
          let attempt = 0;
          attempt <= PRODUCT_LOAD_RETRY_DELAYS_MS.length;
          attempt += 1
        ) {
          try {
            const response = await fetch(`/api/products?${params.toString()}`, {
              cache: "no-store",
              signal: abortController?.signal,
            });

            if (requestId !== latestProductsRequestIdRef.current) {
              return;
            }

            if (!response.ok) {
              const responseData = (await response
                .json()
                .catch(() => ({}))) as {
                message?: string;
              };
              throw new Error(
                responseData.message || "Unable to load products.",
              );
            }

            data = (await response.json()) as {
              items: ApiProduct[];
              hasMore: boolean;
              nextCursor: string | null;
            };
            break;
          } catch (error) {
            if (requestId !== latestProductsRequestIdRef.current) {
              return;
            }

            if (error instanceof DOMException && error.name === "AbortError") {
              throw error;
            }

            const shouldRetry =
              reset &&
              cursor === null &&
              attempt < PRODUCT_LOAD_RETRY_DELAYS_MS.length;

            if (!shouldRetry) {
              throw error;
            }

            await delayWithAbort(
              PRODUCT_LOAD_RETRY_DELAYS_MS[attempt],
              abortController?.signal,
            );
          }
        }

        if (!data) {
          throw new Error("Unable to load products.");
        }

        const normalized = data.items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          price: Number(item.price),
          bundleQty: item.bundleQty,
          bundlePrice:
            item.bundlePrice === null ? null : Number(item.bundlePrice),
          stock: item.stock,
        }));

        if (requestId !== latestProductsRequestIdRef.current) {
          return;
        }

        const mergedItems = reset
          ? normalized
          : (() => {
              const seen = new Set(latestProductsRef.current.map((i) => i.id));
              const nextItems = normalized.filter((i) => !seen.has(i.id));
              return [...latestProductsRef.current, ...nextItems];
            })();

        setProducts((previous) => {
          if (reset) {
            return normalized;
          }

          const seen = new Set(previous.map((item) => item.id));
          const nextItems = normalized.filter((item) => !seen.has(item.id));
          return [...previous, ...nextItems];
        });
        setHasMoreProducts(data.hasMore);
        setNextCursor(data.nextCursor ?? null);
        setProductsLoadError(null);
        productListCache.set(cacheKey, {
          items: mergedItems,
          hasMore: data.hasMore,
          nextCursor: data.nextCursor ?? null,
          updatedAt: Date.now(),
        });
      } catch (error) {
        if (requestId !== latestProductsRequestIdRef.current) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const messageText =
          error instanceof Error ? error.message : "Unable to load products.";
        setProductsLoadError(messageText);
        if (reset && latestProductsRef.current.length === 0) {
          setProducts([]);
        }
      } finally {
        if (requestId !== latestProductsRequestIdRef.current) {
          return;
        }

        if (reset && resetLoadAbortRef.current === abortController) {
          resetLoadAbortRef.current = null;
        }

        if (reset) {
          setLoadingProducts(false);
        } else {
          setLoadingMoreProducts(false);
        }
      }
    },
    [
      debouncedSearch,
      setProducts,
      setHasMoreProducts,
      setNextCursor,
      setProductsLoadError,
      setLoadingProducts,
      setLoadingMoreProducts,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts({ cursor: null, reset: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [reloadToken, debouncedSearch, loadProducts]);

  useEffect(() => {
    if (activeTab !== "transactions") {
      return;
    }

    const loadTransactions = async () => {
      try {
        const cacheKey = `${transactionFilter}:${currentTransactionPage}`;
        const cached = transactionCache.get(cacheKey);
        if (
          cached &&
          Date.now() - cached.updatedAt < TRANSACTION_CACHE_TTL_MS
        ) {
          setTransactions(cached.items);
          setTotalTransactions(cached.total);
          setLoadingTransactions(false);
          return;
        }

        setLoadingTransactions(true);

        const params = new URLSearchParams({
          page: String(currentTransactionPage),
          limit: String(TRANSACTION_PAGE_SIZE),
        });

        if (transactionFilter !== "ALL") {
          params.set("status", transactionFilter);
        }

        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load transactions");
        }

        const data = (await response.json()) as {
          items: ApiOrder[];
          total: number;
        };

        const normalizedItems = data.items.map((order) => ({
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          total: Number(order.total),
          note: order.note ?? "",
          createdAt: order.createdAt,
        }));

        const total = Number(data.total ?? 0);
        setTotalTransactions(total);
        setTransactions(normalizedItems);
        transactionCache.set(cacheKey, {
          items: normalizedItems,
          total,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };

    void loadTransactions();
  }, [activeTab, currentTransactionPage, transactionFilter]);

  const updateQty = (productId: string, delta: number) => {
    setCart((items) => {
      return items
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          if (delta > 0 && item.quantity >= item.stock) {
            return item;
          }

          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const addToCart = (product: Product, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));

    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (!existing) {
        return [
          ...items,
          {
            ...product,
            quantity: Math.min(safeQuantity, product.stock),
          },
        ];
      }

      return items.map((item) => {
        if (item.id !== product.id) {
          return item;
        }

        const nextQuantity = Math.min(item.quantity + safeQuantity, item.stock);
        return { ...item, quantity: nextQuantity };
      });
    });
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getLineTotal(item), 0),
    [cart],
  );
  const tax = useMemo(() => computeTax(subtotal), [subtotal]);
  const total = useMemo(
    () => Number((subtotal + tax).toFixed(2)),
    [subtotal, tax],
  );
  const quickCashAmounts = [100, 200, 500, 1000];
  const change = useMemo(
    () => Number(((paymentAmount ?? 0) - total).toFixed(2)),
    [paymentAmount, total],
  );
  const hasEnoughPayment = cart.length > 0 && (paymentAmount ?? 0) >= total;
  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const virtualListContainerHeight =
    "calc(100dvh - var(--mobile-header-offset) - var(--mobile-bottom-offset))";
  const virtualListFallbackHeight = 460;
  const overscanRows = 8;

  const requestNextPage = useCallback(() => {
    if (
      !hasMoreProducts ||
      !nextCursor ||
      loadingMoreProducts ||
      loadingProducts
    ) {
      return;
    }

    void loadProducts({ cursor: nextCursor, reset: false });
  }, [
    hasMoreProducts,
    nextCursor,
    loadingMoreProducts,
    loadingProducts,
    loadProducts,
  ]);

  const submitCheckout = async () => {
    try {
      setCheckingOut(true);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          subtotal,
          tax,
          total,
          note: "POS checkout",
          items: cart.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            bundleQty: item.bundleQty,
            bundlePrice: item.bundlePrice,
          })),
        }),
      });

      if (!hasEnoughPayment) {
        message.error("Payment is not enough.");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Checkout failed");
      }

      setProducts((items) => {
        return items.map((product) => {
          const sold = cart.find((item) => item.id === product.id);
          if (!sold) {
            return product;
          }

          return {
            ...product,
            stock: Math.max(product.stock - sold.quantity, 0),
          };
        });
      });

      setCart([]);
      setPaymentAmount(null);
      message.success(
        `Checkout complete. Change: ₱${Math.max(change, 0).toFixed(2)}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Checkout failed";
      message.error(errorMessage);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleTabChange = (tab: BottomNavTabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }
    params.set("txFilter", transactionFilter);
    params.set("txPage", String(currentTransactionPage));
    router.replace(`/pages?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (nextSearch.trim()) {
      params.set("q", nextSearch.trim());
    } else {
      params.delete("q");
    }
    params.set("txFilter", transactionFilter);
    params.set("txPage", String(currentTransactionPage));
    router.replace(`/pages?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <>
      <PageWrapper
        mode={mode}
        title={
          activeTab === "transactions"
            ? "Transactions"
            : activeTab === "cart"
              ? "Cart"
              : activeTab === "settings"
                ? "Settings"
                : "Products"
        }
        isCompactHeight={isCompactHeight}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showSearch={activeTab === "products"}
        searchValue={search}
        onSearchChange={handleSearchChange}
        contentStyle={{
          paddingInline: isCompactHeight ? 10 : 14,
          background:
            mode === "dark"
              ? "linear-gradient(180deg, rgba(8,15,30,0.64), rgba(10,17,31,0.38))"
              : "transparent",
        }}
      >
        <div key={activeTab} className="tab-panel-transition">
          {activeTab === "products" ? (
            <ProductsTabContent
              mode={mode}
              isCompactHeight={isCompactHeight}
              products={products}
              loadingProducts={loadingProducts}
              productsLoadError={productsLoadError}
              loadingMoreProducts={loadingMoreProducts}
              hasMoreProducts={hasMoreProducts}
              virtualListContainerHeight={virtualListContainerHeight}
              virtualListFallbackHeight={virtualListFallbackHeight}
              overscanRows={overscanRows}
              onAddToCart={addToCart}
              onViewProduct={(productId: string) => {
                setSelectedProductId(productId);
                setViewDrawerOpen(true);
              }}
              onRetry={() => {
                setLoadingProducts(true);
                setReloadToken((value) => value + 1);
              }}
              onRowsRendered={(info: { stopIndex: number }) => {
                if (hasMoreProducts && info.stopIndex >= products.length - 3) {
                  requestNextPage();
                }
              }}
            />
          ) : null}

          {activeTab === "cart" ? (
            <CartTabContent
              mode={mode}
              cart={cart}
              cartItemCount={cartItemCount}
              subtotal={subtotal}
              tax={tax}
              total={total}
              paymentAmount={paymentAmount}
              quickCashAmounts={quickCashAmounts}
              change={change}
              checkingOut={checkingOut}
              onPaymentAmountChange={setPaymentAmount}
              onUpdateQty={updateQty}
              onCheckout={() => {
                void submitCheckout();
              }}
            />
          ) : null}

          {activeTab === "transactions" ? (
            <TransactionsTabContent
              mode={mode}
              loadingTransactions={loadingTransactions}
              transactions={transactions}
              transactionFilter={transactionFilter}
              currentTransactionPage={currentTransactionPage}
              totalTransactions={totalTransactions}
              search={search}
              onFilterChange={setTransactionFilter}
              onPageChange={setCurrentTransactionPage}
            />
          ) : null}

          {activeTab === "settings" ? <SettingsTabContent mode={mode} /> : null}
        </div>
      </PageWrapper>

      <ProductViewDrawer
        open={viewDrawerOpen && !editDrawerOpen}
        productId={selectedProductId}
        onClose={() => {
          setViewDrawerOpen(false);
          setSelectedProductId(null);
        }}
        onEdit={() => {
          setViewDrawerOpen(false);
          setEditDrawerOpen(true);
        }}
        onProductDeleted={() => {
          setViewDrawerOpen(false);
          setSelectedProductId(null);
          setReloadToken((prev) => prev + 1);
        }}
      />

      <ProductEditDrawer
        open={editDrawerOpen}
        productId={selectedProductId}
        onClose={() => {
          setEditDrawerOpen(false);
          setViewDrawerOpen(true);
        }}
        onProductUpdated={() => {
          setEditDrawerOpen(false);
          setViewDrawerOpen(false);
          setSelectedProductId(null);
          setReloadToken((prev) => prev + 1);
        }}
      />

      <FloatButton.BackTop
        visibilityHeight={300}
        style={{
          right: 16,
          bottom: "calc(68px + env(safe-area-inset-bottom))",
        }}
      />
    </>
  );
}

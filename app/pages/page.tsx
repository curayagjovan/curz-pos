"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Layout,
  Pagination,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { CartContent } from "@/components/pos/cart-content";
import { useThemeMode } from "@/components/providers/theme-provider";
import { usePosCart } from "@/components/providers/pos-cart-provider";
import { type Product } from "@/components/pos/product-row";
import {
  ProductsEmptyState,
  ProductsLoadErrorState,
  ProductsLoadingMoreState,
  ProductsLoadingState,
} from "@/components/pos/products-list-states";
import { ProductsListViewport } from "@/components/pos/products-list-viewport";
import { PosPageWrapper } from "@/components/pos/pos-page-wrapper";

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty: number | null;
  bundlePrice: number | string | null;
  stock: number;
};

type ApiOrder = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number | string;
  note?: string | null;
  createdAt: string;
};

type Transaction = {
  id: string;
  orderNo: string;
  status: "PAID" | "CANCELLED" | "PENDING";
  total: number;
  note: string;
  createdAt: string;
};

type TransactionFilter = "ALL" | "PAID" | "CANCELLED";
type PosTab = "products" | "cart" | "transactions";

function isPosTab(value: string | null): value is PosTab {
  return value === "products" || value === "cart" || value === "transactions";
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

type TransactionCacheEntry = {
  items: Transaction[];
  total: number;
  updatedAt: number;
};

const TRANSACTION_CACHE_TTL_MS = 30_000;
const transactionCache = new Map<string, TransactionCacheEntry>();
const TRANSACTION_PAGE_SIZE = 10;

export default function Home() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialActiveTab: PosTab = isPosTab(initialTabParam)
    ? initialTabParam
    : "products";
  const { mode } = useThemeMode();
  const {
    addToCart,
    cart,
    subtotal,
    tax,
    total,
    paymentAmount,
    setPaymentAmount,
    quickCashAmounts,
    change,
    hasEnoughPayment,
    updateQty,
    clearCart,
  } = usePosCart();
  const [activeTab, setActiveTab] = useState<PosTab>(initialActiveTab);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const latestProductsRef = useRef<Product[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("ALL");

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
      try {
        const cacheKey = debouncedSearch.toLowerCase();
        if (reset) {
          const cached = productListCache.get(cacheKey);
          if (cached && Date.now() - cached.updatedAt < PRODUCT_CACHE_TTL_MS) {
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

        const response = await fetch(`/api/products?${params.toString()}`);
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(data.message || "Unable to load products.");
        }

        const data = (await response.json()) as {
          items: ApiProduct[];
          hasMore: boolean;
          nextCursor: string | null;
        };

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
        const messageText =
          error instanceof Error ? error.message : "Unable to load products.";
        setProductsLoadError(messageText);
        if (reset) {
          setProducts([]);
        }
      } finally {
        if (reset) {
          setLoadingProducts(false);
        } else {
          setLoadingMoreProducts(false);
        }
      }
    },
    [debouncedSearch],
  );

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
          setTransactionsLoading(false);
          return;
        }

        setTransactionsLoading(true);
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

        const totalCount = Number(data.total ?? 0);
        setTotalTransactions(totalCount);
        setTransactions(normalizedItems);
        transactionCache.set(cacheKey, {
          items: normalizedItems,
          total: totalCount,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error(error);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    void loadTransactions();
  }, [activeTab, currentTransactionPage, transactionFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts({ cursor: null, reset: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [reloadToken, debouncedSearch, loadProducts]);

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

  const getStatusTag = (status: Transaction["status"]) => {
    if (status === "PAID") {
      return <Tag color="green">Successful</Tag>;
    }

    if (status === "CANCELLED") {
      return <Tag color="red">Not Successful</Tag>;
    }

    return <Tag>Pending</Tag>;
  };

  const submitCheckout = async () => {
    try {
      setCheckingOut(true);

      if (!hasEnoughPayment) {
        message.error("Payment is not enough.");
        return;
      }

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

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Checkout failed");
      }

      clearCart();
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

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <PosPageWrapper
        mode={mode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchCardProps={
          activeTab === "products"
            ? {
                search,
                productsCount: products.length,
                onSearchChange: setSearch,
              }
            : undefined
        }
      >
        {activeTab === "products" ? (
          <Row gutter={[10, 10]}>
            {loadingProducts ? <ProductsLoadingState mode={mode} /> : null}
            {!loadingProducts && productsLoadError ? (
              <ProductsLoadErrorState
                error={productsLoadError}
                onRetry={() => {
                  setLoadingProducts(true);
                  setReloadToken((value) => value + 1);
                }}
              />
            ) : null}
            {!loadingProducts && products.length === 0 ? (
              <ProductsEmptyState />
            ) : null}
            {!loadingProducts && !productsLoadError ? (
              <ProductsListViewport
                mode={mode}
                hasMoreProducts={hasMoreProducts}
                products={products}
                onAddToCart={addToCart}
                onRequestNextPage={requestNextPage}
              />
            ) : null}
            {loadingMoreProducts && !loadingProducts ? (
              <ProductsLoadingMoreState />
            ) : null}
          </Row>
        ) : null}

        {activeTab === "cart" ? (
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Card>
              <CartContent
                cart={cart}
                subtotal={subtotal}
                tax={tax}
                total={total}
                paymentAmount={paymentAmount}
                setPaymentAmount={setPaymentAmount}
                quickCashAmounts={quickCashAmounts}
                change={change}
                checkingOut={checkingOut}
                updateQty={updateQty}
                onCheckout={() => {
                  void submitCheckout();
                }}
              />
            </Card>
          </Space>
        ) : null}

        {activeTab === "transactions" ? (
          <Card>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Transactions
              </Typography.Title>
              <Space wrap>
                <Button
                  size="large"
                  type={transactionFilter === "ALL" ? "primary" : "default"}
                  onClick={() => {
                    setCurrentTransactionPage(1);
                    setTransactionFilter("ALL");
                  }}
                >
                  All
                </Button>
                <Button
                  size="large"
                  type={transactionFilter === "PAID" ? "primary" : "default"}
                  onClick={() => {
                    setCurrentTransactionPage(1);
                    setTransactionFilter("PAID");
                  }}
                >
                  Successful
                </Button>
                <Button
                  size="large"
                  type={
                    transactionFilter === "CANCELLED" ? "primary" : "default"
                  }
                  onClick={() => {
                    setCurrentTransactionPage(1);
                    setTransactionFilter("CANCELLED");
                  }}
                >
                  Not Successful
                </Button>
              </Space>
              {transactionsLoading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : transactions.length === 0 ? (
                <Empty description="No transactions yet" />
              ) : (
                <Space
                  orientation="vertical"
                  size={12}
                  style={{ width: "100%" }}
                >
                  <Collapse
                    items={transactions.map((item) => ({
                      key: item.id,
                      label: (
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                          wrap
                        >
                          <Typography.Text strong>
                            {item.orderNo}
                          </Typography.Text>
                          <Space>
                            {getStatusTag(item.status)}
                            <Typography.Text strong>
                              ₱{item.total.toFixed(2)}
                            </Typography.Text>
                          </Space>
                        </Space>
                      ),
                      children: (
                        <Space
                          orientation="vertical"
                          size={6}
                          style={{ width: "100%" }}
                        >
                          <Typography.Text type="secondary">
                            Date: {new Date(item.createdAt).toLocaleString()}
                          </Typography.Text>
                          <Typography.Text>
                            Note: {item.note || "No note"}
                          </Typography.Text>
                        </Space>
                      ),
                    }))}
                  />
                  <Pagination
                    current={currentTransactionPage}
                    pageSize={TRANSACTION_PAGE_SIZE}
                    total={totalTransactions}
                    onChange={(page) => setCurrentTransactionPage(page)}
                    showSizeChanger={false}
                    simple
                  />
                </Space>
              )}
            </Space>
          </Card>
        ) : null}
      </PosPageWrapper>
    </Layout>
  );
}

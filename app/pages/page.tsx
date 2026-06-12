"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List as VirtualList } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  FloatButton,
  Grid,
  Input,
  Layout,
  Row,
  Spin,
  Space,
  Typography,
} from "antd";
import { useThemeMode } from "@/components/providers/theme-provider";
import {
  ShoppingCartOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { computeTax } from "@/lib/tax-config";
import { useCompactHeight } from "@/hooks/use-compact-height";
import { CartContent } from "@/components/pos/cart-content";
import { PosHeader } from "@/components/navigation/pos-header";
import { MobilePageHeader } from "@/components/navigation/mobile-page-header";
import {
  ProductRow,
  LIST_ROW_GAP,
  LIST_ROW_HEIGHT,
  type Product,
} from "@/components/pos/product-row";

const { Content } = Layout;

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

export default function Home() {
  const { message } = App.useApp();
  const router = useRouter();
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const latestProductsRef = useRef<Product[]>([]);

  useEffect(() => {
    latestProductsRef.current = products;
  }, [products]);

  useEffect(() => {
    router.prefetch("/pages/transactions");
  }, [router]);

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
    const timer = window.setTimeout(() => {
      void loadProducts({ cursor: null, reset: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [reloadToken, debouncedSearch, loadProducts]);

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
  const virtualListContainerHeight = isDesktop
    ? 700
    : isCompactHeight
      ? "calc(100vh - 182px)"
      : "calc(100vh - 208px)";
  const virtualListFallbackHeight = isDesktop ? 700 : 560;
  const overscanRows = isDesktop ? 5 : 8;

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
      setCartOpen(false);
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

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      {isDesktop ? (
        <PosHeader mode={mode} isDesktop={isDesktop} activePage="pos" />
      ) : (
        <MobilePageHeader mode={mode} />
      )}
      <Layout style={{ background: "transparent" }}>
        <Content
          style={{
            paddingTop: isDesktop ? 24 : isCompactHeight ? 10 : 14,
            paddingInline: isDesktop ? 24 : isCompactHeight ? 10 : 14,
            paddingBottom: isDesktop
              ? 24
              : "calc(132px + env(safe-area-inset-bottom))",
            maxWidth: isDesktop ? 1200 : 900,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <Space
            orientation="vertical"
            size={isCompactHeight ? 6 : 12}
            style={{ width: "100%" }}
          >
            <Card
              style={{
                borderRadius: isDesktop ? 18 : 16,
                border:
                  mode === "dark" ? "1px solid #273244" : "1px solid #d0dff4",
                background:
                  mode === "dark"
                    ? "linear-gradient(150deg, rgba(17,24,39,0.96), rgba(15,23,42,0.9))"
                    : "linear-gradient(150deg, #ffffff, #f3f8ff)",
                boxShadow:
                  mode === "dark"
                    ? "0 4px 16px rgba(0,0,0,0.28)"
                    : "0 4px 16px rgba(16,40,90,0.07)",
              }}
              styles={{
                body: {
                  padding: isDesktop ? 20 : isCompactHeight ? 12 : 16,
                },
              }}
            >
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography.Text
                    style={{
                      fontSize: isDesktop ? 15 : 13,
                      fontWeight: 700,
                      color: mode === "dark" ? "#e2e8f0" : "#1a3055",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Products
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      background:
                        mode === "dark" ? "rgba(51,65,85,0.7)" : "#eef3fb",
                      border:
                        mode === "dark"
                          ? "1px solid #334155"
                          : "1px solid #d0dff4",
                      borderRadius: 999,
                      padding: "2px 10px",
                    }}
                  >
                    {products.length} items
                  </Typography.Text>
                </div>
                <Input.Search
                  placeholder="Search by name or SKU…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  allowClear
                  size="large"
                  style={{ borderRadius: 12 }}
                />
              </Space>
            </Card>

            <Row gutter={[isDesktop ? 16 : 10, isDesktop ? 16 : 10]}>
              {loadingProducts ? (
                <Col xs={24}>
                  <Card
                    style={{
                      borderStyle: "dashed",
                      borderColor: mode === "dark" ? "#334155" : "#bfdbfe",
                      background:
                        mode === "dark"
                          ? "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))"
                          : "linear-gradient(135deg, #eff6ff, #f8fafc)",
                    }}
                  >
                    <Space
                      align="center"
                      size={12}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      <Spin size="large" />
                      <Space orientation="vertical" size={2}>
                        <Typography.Text strong>
                          Loading products...
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          Preparing your inventory list.
                        </Typography.Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ) : null}
              {loadingProducts
                ? Array.from({ length: isDesktop ? 6 : 4 }).map((_, idx) => (
                    <Col xs={24} sm={12} xl={8} key={`loading-${idx}`}>
                      <Card loading />
                    </Col>
                  ))
                : null}
              {!loadingProducts && productsLoadError ? (
                <Col xs={24}>
                  <Card>
                    <Space
                      orientation="vertical"
                      style={{ width: "100%" }}
                      size={10}
                    >
                      <Typography.Text type="danger">
                        {productsLoadError}
                      </Typography.Text>
                      <Button
                        onClick={() => {
                          setLoadingProducts(true);
                          setReloadToken((value) => value + 1);
                        }}
                      >
                        Retry Loading Products
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ) : null}
              {!loadingProducts && products.length === 0 ? (
                <Col xs={24}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "40px 20px",
                    }}
                  >
                    <Empty
                      description="No Products"
                      style={{ marginTop: "20px" }}
                    >
                      <Typography.Text
                        type="secondary"
                        style={{ display: "block", marginBottom: "16px" }}
                      >
                        Add products to your database and they will appear here.
                      </Typography.Text>
                      <Button type="primary" href="/pages/settings/product">
                        Add Product
                      </Button>
                    </Empty>
                  </div>
                </Col>
              ) : null}
              {!loadingProducts && !productsLoadError ? (
                <Col xs={24}>
                  <div
                    style={{
                      height: virtualListContainerHeight,
                      width: "100%",
                      overflow: "hidden",
                      borderRadius: isDesktop ? 18 : 14,
                      border:
                        mode === "dark"
                          ? "1px solid rgba(51, 65, 85, 0.9)"
                          : "1px solid rgba(214, 225, 241, 0.95)",
                      background:
                        mode === "dark"
                          ? "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(15,23,42,0.52))"
                          : "linear-gradient(180deg, rgba(250,252,255,0.9), rgba(242,247,255,0.9))",
                      padding: isDesktop ? 10 : 6,
                    }}
                  >
                    <AutoSizer
                      renderProp={({
                        width,
                        height,
                      }: {
                        width: number | undefined;
                        height: number | undefined;
                      }) => (
                        <VirtualList
                          style={{
                            width: Math.max(width ?? 1, 1),
                            height: Math.max(
                              height ?? virtualListFallbackHeight,
                              1,
                            ),
                          }}
                          rowCount={products.length}
                          rowHeight={LIST_ROW_HEIGHT + LIST_ROW_GAP}
                          overscanCount={overscanRows}
                          rowComponent={ProductRow}
                          rowProps={{
                            products,
                            onAddToCart: addToCart,
                          }}
                          onRowsRendered={({
                            stopIndex,
                          }: {
                            stopIndex: number;
                          }) => {
                            if (
                              hasMoreProducts &&
                              stopIndex >= products.length - 3
                            ) {
                              requestNextPage();
                            }
                          }}
                        />
                      )}
                    />
                  </div>
                </Col>
              ) : null}
              {loadingMoreProducts && !loadingProducts ? (
                <Col xs={24}>
                  <Card size="small">
                    <Space align="center" size={10} style={{ width: "100%" }}>
                      <Spin size="small" />
                      <Typography.Text type="secondary">
                        Fetching more products...
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              ) : null}
            </Row>
          </Space>
        </Content>
      </Layout>

      {!isDesktop ? (
        <>
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              display: "flex",
              justifyContent: "center",
              paddingInline: 14,
              paddingTop: 36,
              paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
              background:
                mode === "dark"
                  ? "linear-gradient(to top, rgba(10,16,30,0.92) 56%, transparent)"
                  : "linear-gradient(to top, rgba(240,247,255,0.9) 56%, transparent)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 560,
                borderRadius: 24,
                border:
                  mode === "dark"
                    ? "1px solid rgba(71,85,105,0.75)"
                    : "1px solid rgba(191,219,254,0.85)",
                background:
                  mode === "dark"
                    ? "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.82))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,252,255,0.94))",
                backdropFilter: "blur(14px)",
                boxShadow:
                  mode === "dark"
                    ? "0 14px 30px rgba(2, 6, 23, 0.45)"
                    : "0 14px 34px rgba(30,58,138,0.16)",
                padding: "9px 10px 8px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  alignItems: "center",
                  columnGap: 94,
                }}
              >
                <Link href="/pages/" style={{ display: "block" }}>
                  <Button
                    type="text"
                    block
                    icon={<AppstoreOutlined />}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      color: mode === "dark" ? "#93c5fd" : "#1d4ed8",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Products
                  </Button>
                </Link>
                <Link href="/pages/transactions" style={{ display: "block" }}>
                  <Button
                    type="text"
                    block
                    icon={<FileTextOutlined />}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      color: mode === "dark" ? "#cbd5e1" : "#475569",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Transactions
                  </Button>
                </Link>
              </div>

              <Button
                type="primary"
                shape="circle"
                icon={<ShoppingCartOutlined />}
                onClick={() => setCartOpen(true)}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -24,
                  transform: "translateX(-50%)",
                  width: 64,
                  height: 64,
                  border:
                    mode === "dark"
                      ? "4px solid rgba(15,23,42,0.95)"
                      : "4px solid rgba(255,255,255,0.98)",
                  background: "linear-gradient(145deg, #60a5fa, #2563eb)",
                  boxShadow:
                    "0 14px 30px rgba(37, 99, 235, 0.48), 0 4px 10px rgba(37, 99, 235, 0.34)",
                }}
              >
                <Badge
                  count={cartItemCount}
                  color="#ffffff"
                  overflowCount={99}
                  offset={[10, -8]}
                  styles={{ indicator: { color: "#1e3a8a", fontWeight: 700 } }}
                />
              </Button>
            </div>
          </div>

          <Drawer
            title="Cart"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            placement="bottom"
            size="78vh"
          >
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
          </Drawer>
        </>
      ) : null}

      <FloatButton.BackTop
        visibilityHeight={300}
        style={{
          right: 16,
          bottom: isDesktop
            ? "calc(24px + env(safe-area-inset-bottom))"
            : "calc(118px + env(safe-area-inset-bottom))",
        }}
      />
    </Layout>
  );
}

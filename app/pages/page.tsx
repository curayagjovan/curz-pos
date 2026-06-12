"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List as VirtualList, type RowComponentProps } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  FloatButton,
  Grid,
  Input,
  Layout,
  Row,
  Spin,
  Space,
  Tag,
  Typography,
} from "antd";
import { useThemeMode } from "@/components/providers/theme-provider";
import {
  DeleteOutlined,
  SettingOutlined,
  EditOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { computeTax } from "@/lib/tax-config";
import { useCompactHeight } from "@/hooks/use-compact-height";
import { CartContent } from "@/components/pos/cart-content";

const { Header, Content } = Layout;

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  bundleQty: number | null;
  bundlePrice: number | string | null;
  stock: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
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
const LIST_ROW_GAP = 12;
const LIST_ROW_HEIGHT = 262;

type ProductRowProps = {
  products: Product[];
  deletingId: string | null;
  addToCart: (product: Product) => void;
  deleteProduct: (productId: string) => void;
};

type ProductListCacheEntry = {
  items: Product[];
  hasMore: boolean;
  nextCursor: string | null;
  updatedAt: number;
};

const PRODUCT_CACHE_TTL_MS = 30_000;
const productListCache = new Map<string, ProductListCacheEntry>();

function ProductRow({
  index,
  style,
  products,
  deletingId,
  addToCart,
  deleteProduct,
}: RowComponentProps<ProductRowProps>) {
  const product = products[index];
  const parsedTop =
    typeof style.top === "number"
      ? style.top
      : Number.parseFloat(String(style.top ?? "0"));
  const parsedHeight =
    typeof style.height === "number"
      ? style.height
      : Number.parseFloat(String(style.height ?? String(LIST_ROW_HEIGHT)));
  const safeTop = Number.isFinite(parsedTop) ? parsedTop : 0;
  const safeHeight = Number.isFinite(parsedHeight)
    ? parsedHeight
    : LIST_ROW_HEIGHT;

  if (!product) {
    return <div style={style} />;
  }

  return (
    <div
      style={{
        ...style,
        top: safeTop + LIST_ROW_GAP / 2,
        height: Math.max(safeHeight - LIST_ROW_GAP, 0),
      }}
    >
      <Card
        title={product.name}
        extra={<Tag>{product.sku}</Tag>}
        actions={[
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => addToCart(product)}
            disabled={product.stock <= 0}
          >
            {product.stock <= 0 ? "Out of Stock" : "Add"}
          </Button>,
          <Link key="edit" href={`/pages/products/${product.id}/edit`}>
            <Button icon={<EditOutlined />}>Edit</Button>
          </Link>,
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === product.id}
            onClick={() => deleteProduct(product.id)}
          >
            Delete
          </Button>,
        ]}
      >
        <Space orientation="vertical">
          <Typography.Text strong>₱{product.price.toFixed(2)}</Typography.Text>
          {product.bundleQty && product.bundlePrice !== null ? (
            <Typography.Text type="secondary">
              {product.bundleQty} for ₱{product.bundlePrice.toFixed(2)}
            </Typography.Text>
          ) : null}
          <Typography.Text type="secondary">
            Stock: {product.stock}
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}

export default function Home() {
  const { message, modal } = App.useApp();
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProducts({ cursor: null, reset: true });
  }, [reloadToken, debouncedSearch, loadProducts]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      message.warning("This product is out of stock.");
      return;
    }

    setCart((items) => {
      const found = items.find((item) => item.id === product.id);
      if (!found) {
        return [...items, { ...product, quantity: 1 }];
      }

      return items.map((item) => {
        if (item.id !== product.id) {
          return item;
        }

        return { ...item, quantity: Math.min(item.quantity + 1, item.stock) };
      });
    });
  };

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

  const deleteProduct = (productId: string) => {
    modal.confirm({
      title: "Delete Product",
      content: "Are you sure you want to delete this product?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          setDeletingId(productId);
          const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(data.message || "Failed to delete product");
          }

          setProducts((items) => items.filter((item) => item.id !== productId));
          message.success("Product deleted successfully");
        } catch (error) {
          console.error(error);
          message.error(
            error instanceof Error
              ? error.message
              : "Unable to delete product. Please try again.",
          );
        } finally {
          setDeletingId(null);
        }
      },
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
  const virtualListHeight = isDesktop ? 700 : 560;
  const overscanRows = isDesktop ? 4 : 6;

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
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: isDesktop ? "nowrap" : "wrap",
          gap: 8,
          borderBottom:
            mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
          background:
            mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          paddingInline: isDesktop ? 16 : 12,
          paddingTop: "max(env(safe-area-inset-top), 8px)",
          minHeight: `calc(${isCompactHeight ? 48 : 56}px + env(safe-area-inset-top))`,
        }}
      >
        <Typography.Title
          level={isDesktop ? 3 : 4}
          style={{
            margin: 0,
            color: mode === "dark" ? "#e5e7eb" : "#12325a",
          }}
        >
          Curz POS
        </Typography.Title>
        <Space size={8} wrap>
          <Link href="/pages/settings">
            <Button
              icon={<SettingOutlined />}
              size={isDesktop ? "middle" : "large"}
              aria-label="Settings"
            />
          </Link>
          <Link href="/pages/">
            <Button type="primary" size={isDesktop ? "middle" : "large"}>
              POS
            </Button>
          </Link>
          <Link href="/pages/transactions">
            <Button size={isDesktop ? "middle" : "large"}>Transactions</Button>
          </Link>
        </Space>
      </Header>
      <Layout style={{ background: "transparent" }}>
        <Content
          style={{
            paddingTop: isDesktop ? 24 : isCompactHeight ? 10 : 14,
            paddingInline: isDesktop ? 24 : isCompactHeight ? 10 : 14,
            paddingBottom: isDesktop
              ? 24
              : "calc(104px + env(safe-area-inset-bottom))",
            maxWidth: isDesktop ? 1200 : 900,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <Space
            orientation="vertical"
            size={isCompactHeight ? 12 : 18}
            style={{ width: "100%" }}
          >
            <Card>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={14}>
                  <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    Mobile POS
                  </Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    Add your products and start selling. This view is optimized
                    for phone and tablet workflow.
                  </Typography.Paragraph>
                </Col>
                <Col xs={24} md={10}>
                  <Space
                    orientation="vertical"
                    style={{ width: "100%" }}
                    size={10}
                  >
                    <Input.Search
                      placeholder="Search by name or SKU"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      allowClear
                    />
                    <Space style={{ width: "100%" }} size={8}>
                      <Link href="/pages/products/add" style={{ flex: 1 }}>
                        <Button type="default" block>
                          Add Product
                        </Button>
                      </Link>
                      <Link
                        href="/pages/products/bulk-import"
                        style={{ flex: 1 }}
                      >
                        <Button block>Bulk Import</Button>
                      </Link>
                    </Space>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
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
                  <Card>
                    <Typography.Text type="secondary">
                      No products yet. Add products to your database and they
                      will appear here.
                    </Typography.Text>
                  </Card>
                </Col>
              ) : null}
              {!loadingProducts && !productsLoadError ? (
                <Col xs={24}>
                  <div
                    style={{
                      height: virtualListHeight,
                      width: "100%",
                      borderRadius: 12,
                      border:
                        mode === "dark"
                          ? "1px solid #1f2937"
                          : "1px solid #e2e8f0",
                      overflow: "hidden",
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
                            height: Math.max(height ?? virtualListHeight, 1),
                          }}
                          rowCount={products.length}
                          rowHeight={LIST_ROW_HEIGHT + LIST_ROW_GAP}
                          overscanCount={overscanRows}
                          rowComponent={ProductRow}
                          rowProps={{
                            products,
                            deletingId,
                            addToCart,
                            deleteProduct,
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
          <Button
            type="primary"
            size="large"
            icon={<ShoppingCartOutlined />}
            onClick={() => setCartOpen(true)}
            style={{
              position: "fixed",
              bottom: "calc(16px + env(safe-area-inset-bottom))",
              left: 16,
              right: 16,
              zIndex: 30,
              height: 48,
            }}
          >
            <Space size={8}>
              <span>View Cart</span>
              <Badge
                count={cartItemCount}
                color="#ffffff"
                styles={{ indicator: { color: "#000000" } }}
              />
            </Space>
          </Button>

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
            : "calc(88px + env(safe-area-inset-bottom))",
        }}
      />
    </Layout>
  );
}

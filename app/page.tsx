"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Grid,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useThemeMode } from "./theme-provider";
import {
  DeleteOutlined,
  EditOutlined,
  MinusOutlined,
  MoonOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  SunOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  price: number | string;
  stock: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
};

type CartItem = Product & { quantity: number };

export default function Home() {
  const { message } = App.useApp();
  const { mode, toggleMode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          setProducts([]);
          return;
        }

        const data = (await response.json()) as ApiProduct[];
        const normalized = data.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          price: Number(item.price),
          stock: item.stock,
        }));
        setProducts(normalized);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    void loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return products;
    }

    return products.filter((item) => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.sku.toLowerCase().includes(keyword)
      );
    });
  }, [products, search]);

  const addToCart = (product: Product) => {
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

          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const deleteProduct = (productId: string) => {
    Modal.confirm({
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
            throw new Error("Failed to delete product");
          }

          setProducts((items) => items.filter((item) => item.id !== productId));
          message.success("Product deleted successfully");
        } catch (error) {
          console.error(error);
          message.error("Unable to delete product. Please try again.");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const tax = useMemo(() => subtotal * 0.12, [subtotal]);
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

  const cartContent = (
    <Space orientation="vertical" style={{ width: "100%" }} size={14}>
      <Space align="center">
        <ShoppingCartOutlined style={{ fontSize: 18, color: "#0b6bcb" }} />
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cart
        </Typography.Title>
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cart.length === 0 ? (
          <Typography.Text type="secondary">No items yet</Typography.Text>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography.Text strong>{item.name}</Typography.Text>
                <Typography.Text strong>
                  ₱{(item.quantity * item.price).toFixed(2)}
                </Typography.Text>
              </div>
              <Typography.Text type="secondary">
                {item.quantity} x ₱{item.price.toFixed(2)}
              </Typography.Text>
              <Space>
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => updateQty(item.id, -1)}
                  size="small"
                />
                <Typography.Text>{item.quantity}</Typography.Text>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => updateQty(item.id, 1)}
                  size="small"
                />
              </Space>
            </div>
          ))
        )}
      </div>

      <Divider style={{ margin: "8px 0" }} />
      <Statistic title="Subtotal" value={subtotal} precision={2} prefix="₱" />
      <Statistic title="Tax (12%)" value={tax} precision={2} prefix="₱" />
      <Statistic
        title="Grand Total"
        value={total}
        precision={2}
        prefix="₱"
        styles={{ content: { color: "#0b6bcb" } }}
      />

      <InputNumber<number>
        style={{ width: "100%" }}
        min={0}
        step={1}
        precision={2}
        prefix="₱"
        placeholder="Payment amount"
        value={paymentAmount ?? undefined}
        onChange={(value) => setPaymentAmount(value ?? null)}
      />

      <Space wrap>
        <Button onClick={() => setPaymentAmount(Number(total.toFixed(2)))}>
          Exact
        </Button>
        {quickCashAmounts.map((amount) => (
          <Button key={amount} onClick={() => setPaymentAmount(amount)}>
            ₱{amount}
          </Button>
        ))}
      </Space>

      <Statistic
        title="Change"
        value={Math.max(change, 0)}
        precision={2}
        prefix="₱"
        styles={{ content: { color: change >= 0 ? "#16a34a" : "#dc2626" } }}
      />
      {change < 0 ? (
        <Typography.Text type="danger">
          Insufficient payment by ₱{Math.abs(change).toFixed(2)}
        </Typography.Text>
      ) : null}

      <Button
        type="primary"
        size="large"
        loading={checkingOut}
        disabled={cart.length === 0 || paymentAmount === null || checkingOut}
        onClick={() => {
          void submitCheckout();
        }}
      >
        Checkout
      </Button>
    </Space>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom:
            mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
          background:
            mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
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
        <Space size={8}>
          <Button
            icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleMode}
            aria-label="Toggle dark mode"
          />
          <Link href="/">
            <Button type="primary">POS</Button>
          </Link>
          <Link href="/transactions">
            <Button>Transactions</Button>
          </Link>
        </Space>
      </Header>
      <Layout style={{ background: "transparent" }}>
        <Content
          style={{
            padding: isDesktop ? 24 : 14,
            paddingBottom: isDesktop ? 24 : 84,
          }}
        >
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
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
                      <Link href="/products/add" style={{ flex: 1 }}>
                        <Button type="default" block>
                          Add Product
                        </Button>
                      </Link>
                      <Link href="/products/bulk-import" style={{ flex: 1 }}>
                        <Button block>Bulk Import</Button>
                      </Link>
                    </Space>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
              {!loadingProducts && visibleProducts.length === 0 ? (
                <Col xs={24}>
                  <Card>
                    <Typography.Text type="secondary">
                      No products yet. Add products to your database and they
                      will appear here.
                    </Typography.Text>
                  </Card>
                </Col>
              ) : null}
              {visibleProducts.map((product) => (
                <Col xs={24} sm={12} xl={8} key={product.id}>
                  <Card
                    title={product.name}
                    extra={<Tag>{product.sku}</Tag>}
                    actions={[
                      <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => addToCart(product)}
                      >
                        Add
                      </Button>,
                      <Link key="edit" href={`/products/${product.id}/edit`}>
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
                      <Typography.Text strong>
                        ₱{product.price.toFixed(2)}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Stock: {product.stock}
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              ))}
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
              bottom: 16,
              left: 16,
              right: 16,
              zIndex: 30,
              height: 48,
            }}
          >
            <Space size={8}>
              <span>View Cart</span>
              <Badge count={cartItemCount} color="#ffffff" />
            </Space>
          </Button>

          <Drawer
            title="Cart"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            placement="bottom"
            size="78vh"
          >
            {cartContent}
          </Drawer>
        </>
      ) : null}
    </Layout>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Layout,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

const { Header, Content, Sider } = Layout;

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
};

type CartItem = Product & { quantity: number };

const demoProducts: Product[] = [
  { id: "p1", sku: "ESP-001", name: "Espresso", price: 3.25, stock: 41 },
  { id: "p2", sku: "LAT-001", name: "Cafe Latte", price: 4.5, stock: 32 },
  { id: "p3", sku: "CRS-002", name: "Butter Croissant", price: 2.9, stock: 27 },
  { id: "p4", sku: "SND-011", name: "Chicken Sandwich", price: 6.5, stock: 15 },
  { id: "p5", sku: "TEA-003", name: "Iced Tea", price: 2.25, stock: 26 },
  { id: "p6", sku: "CKE-014", name: "Carrot Cake", price: 5.75, stock: 9 },
];

export default function Home() {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return demoProducts;
    }

    return demoProducts.filter((item) => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.sku.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

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

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const tax = useMemo(() => subtotal * 0.12, [subtotal]);
  const total = subtotal + tax;

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #d8e3f2",
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0, color: "#12325a" }}>
          Curz POS
        </Typography.Title>
        <Space>
          <Tag color="blue">Next.js + AntD</Tag>
          <Tag color="cyan">Supabase Ready</Tag>
        </Space>
      </Header>
      <Layout style={{ background: "transparent" }}>
        <Content style={{ padding: 24 }}>
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Card>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={14}>
                  <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    Start Selling Fast
                  </Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    This starter includes Prisma models, a Supabase-ready
                    database config, and a Vercel deployment path.
                  </Typography.Paragraph>
                </Col>
                <Col xs={24} md={10}>
                  <Input.Search
                    placeholder="Search by name or SKU"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    allowClear
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
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
                    ]}
                  >
                    <Space orientation="vertical">
                      <Typography.Text strong>
                        ${product.price.toFixed(2)}
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

        <Sider
          width={360}
          theme="light"
          style={{ borderLeft: "1px solid #d8e3f2", padding: 18 }}
        >
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Space align="center">
              <ShoppingCartOutlined
                style={{ fontSize: 18, color: "#0b6bcb" }}
              />
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
                        ${(item.quantity * item.price).toFixed(2)}
                      </Typography.Text>
                    </div>
                    <Typography.Text type="secondary">
                      {item.quantity} x ${item.price.toFixed(2)}
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
            <Statistic
              title="Subtotal"
              value={subtotal}
              precision={2}
              prefix="$"
            />
            <Statistic title="Tax (12%)" value={tax} precision={2} prefix="$" />
            <Statistic
              title="Grand Total"
              value={total}
              precision={2}
              prefix="$"
              styles={{ content: { color: "#0b6bcb" } }}
            />

            <Button
              type="primary"
              size="large"
              disabled={cart.length === 0}
              onClick={() => {
                message.success(
                  "Starter checkout action. Connect this to your order API route.",
                );
              }}
            >
              Checkout
            </Button>
          </Space>
        </Sider>
      </Layout>
    </Layout>
  );
}

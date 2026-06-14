"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Descriptions,
  FloatButton,
  Grid,
  Layout,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";
import { useCompactHeight } from "@/app/hooks/use-compact-height";

const { Header, Content } = Layout;

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  cost: number | string;
  markupPct: number | string;
  bundleQty: number | null;
  bundleMarkdownPct: number | string | null;
  bundlePrice: number | string | null;
  price: number | string;
  stock: number;
  isActive: boolean;
};

export default function ProductDetailsPage() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(data.message || "Failed to load product");
        }

        const data = (await response.json()) as ApiProduct;
        setProduct(data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load product";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      void loadProduct();
    }
  }, [message, productId]);

  const handleDelete = () => {
    modal.confirm({
      title: "Delete product?",
      content: "This will hide the product from the POS product list.",
      okText: "Delete",
      okButtonProps: { danger: true, loading: deleting },
      cancelText: "Cancel",
      async onOk() {
        try {
          setDeleting(true);
          const response = await fetch(`/api/products/${productId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
              message?: string;
            };
            throw new Error(data.message || "Failed to delete product");
          }

          message.success("Product deleted successfully.");
          router.push("/pages/");
          router.refresh();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete product";
          message.error(errorMessage);
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          borderBottom:
            mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
          background:
            mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
          paddingInline: isDesktop ? 16 : 12,
          paddingTop: "max(env(safe-area-inset-top), 8px)",
          minHeight: `calc(${isCompactHeight ? 48 : 56}px + env(safe-area-inset-top))`,
        }}
      >
        <Space>
          <Link href="/pages/">
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              size={isDesktop ? "middle" : "large"}
            >
              Back
            </Button>
          </Link>
          <Typography.Title
            level={isDesktop ? 4 : 5}
            style={{
              margin: 0,
              color: mode === "dark" ? "#e5e7eb" : "#12325a",
            }}
          >
            Product Details
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{
          paddingTop: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingInline: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 820,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={18}>
          <Card>
            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : product ? (
              <Space orientation="vertical" style={{ width: "100%" }} size={16}>
                <Space
                  orientation="vertical"
                  size={4}
                  style={{ width: "100%" }}
                >
                  <Space wrap>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                      {product.name}
                    </Typography.Title>
                    <Tag color={product.stock > 0 ? "blue" : "red"}>
                      {product.stock > 0 ? "In Stock" : "Out of Stock"}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    {product.sku}
                  </Typography.Text>
                </Space>

                <Descriptions
                  bordered
                  column={1}
                  size={isDesktop ? "default" : "small"}
                  items={[
                    {
                      key: "price",
                      label: "Selling Price",
                      children: `₱${Number(product.price).toFixed(2)}`,
                    },
                    {
                      key: "cost",
                      label: "Cost",
                      children: `₱${Number(product.cost).toFixed(2)}`,
                    },
                    {
                      key: "markup",
                      label: "Markup",
                      children: `${Number(product.markupPct).toFixed(2)}%`,
                    },
                    {
                      key: "stock",
                      label: "Stock",
                      children: product.stock,
                    },
                    {
                      key: "unit",
                      label: "Unit",
                      children: product.unit || "Not set",
                    },
                    {
                      key: "description",
                      label: "Description",
                      children: product.description || "No description",
                    },
                    {
                      key: "bundleQty",
                      label: "Bundle Quantity",
                      children: product.bundleQty ?? "Not set",
                    },
                    {
                      key: "bundleMarkdown",
                      label: "Bundle Markdown",
                      children:
                        product.bundleMarkdownPct === null
                          ? "Not set"
                          : `${Number(product.bundleMarkdownPct).toFixed(2)}%`,
                    },
                    {
                      key: "bundlePrice",
                      label: "Bundle Price",
                      children:
                        product.bundlePrice === null
                          ? "Not set"
                          : `₱${Number(product.bundlePrice).toFixed(2)}`,
                    },
                  ]}
                />

                <Space
                  direction={isDesktop ? "horizontal" : "vertical"}
                  style={{ width: "100%" }}
                >
                  <Link
                    href={`/pages/products/${product.id}/edit`}
                    style={{ width: isDesktop ? "auto" : "100%" }}
                  >
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      block={!isDesktop}
                    >
                      Edit Product
                    </Button>
                  </Link>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDelete}
                    loading={deleting}
                    block={!isDesktop}
                  >
                    Delete Product
                  </Button>
                </Space>
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Product not found.
              </Typography.Text>
            )}
          </Card>
        </Space>
      </Content>

      <FloatButton.BackTop
        visibilityHeight={300}
        style={{
          right: 16,
          bottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
      />
    </Layout>
  );
}

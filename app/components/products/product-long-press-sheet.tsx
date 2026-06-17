"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

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

type ProductLongPressSheetProps = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onProductDeleted: () => void;
};

export function ProductLongPressSheet({
  open,
  productId,
  onClose,
  onEdit,
  onProductDeleted,
}: ProductLongPressSheetProps) {
  const { message, modal } = App.useApp();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !productId) {
      return;
    }

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

    void loadProduct();
  }, [open, productId, message]);

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
          onClose();
          onProductDeleted();
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
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      size="70vh"
      title={null}
      styles={{
        mask: {
          background: "rgba(2, 6, 23, 0.42)",
          backdropFilter: "blur(8px)",
        },
        section: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        },
        body: {
          padding: 12,
          overflow: "auto",
        },
      }}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setProduct(null);
          setLoading(true);
        }
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : product ? (
        <Space
          direction="vertical"
          size={12}
          className="w-full animate-[long-press-sheet-enter_300ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <div className="flex justify-center pt-1">
            <span className="h-1.5 w-11 rounded-full bg-slate-300/80 dark:bg-slate-500/70" />
          </div>

          <Card className="animate-[long-press-card-pop_260ms_cubic-bezier(0.22,1,0.36,1)] rounded-[22px] border border-slate-300/45 bg-white/80 shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-600/60 dark:bg-slate-900/60 dark:shadow-[0_18px_42px_rgba(2,6,23,0.45)]">
            <Space direction="vertical" size={8} className="w-full">
              <Space wrap align="center" className="w-full justify-between">
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {product.name}
                </Typography.Title>
                <Tag color={product.stock > 0 ? "blue" : "red"}>
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </Tag>
              </Space>

              <Typography.Text type="secondary">
                SKU {product.sku}
              </Typography.Text>

              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  {
                    key: "price",
                    label: "Selling Price",
                    children: `P${Number(product.price).toFixed(2)}`,
                  },
                  {
                    key: "cost",
                    label: "Cost",
                    children: `P${Number(product.cost).toFixed(2)}`,
                  },
                  {
                    key: "unit",
                    label: "Unit",
                    children: product.unit || "Not set",
                  },
                  {
                    key: "stock",
                    label: "Stock",
                    children: product.stock,
                  },
                  {
                    key: "description",
                    label: "Description",
                    children: product.description || "No description",
                  },
                ]}
              />
            </Space>
          </Card>

          <Card className="animate-[long-press-card-pop_260ms_cubic-bezier(0.22,1,0.36,1)] rounded-[22px] border border-slate-300/45 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.1)] backdrop-blur dark:border-slate-600/60 dark:bg-slate-900/70 dark:shadow-[0_18px_42px_rgba(2,6,23,0.38)]">
            <Space direction="vertical" className="w-full" size={10}>
              <Typography.Text strong>Quick Actions</Typography.Text>
              <Button
                type="primary"
                icon={<EditOutlined />}
                block
                className="h-10 rounded-xl font-semibold"
                onClick={onEdit}
              >
                Edit Product
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                block
                className="h-10 rounded-xl font-semibold"
                onClick={handleDelete}
                loading={deleting}
              >
                Delete Product
              </Button>
            </Space>
          </Card>
        </Space>
      ) : (
        <Typography.Text type="secondary">Product not found.</Typography.Text>
      )}
    </Drawer>
  );
}

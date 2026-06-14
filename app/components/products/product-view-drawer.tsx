"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
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

type ProductViewDrawerProps = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onProductDeleted: () => void;
};

export function ProductViewDrawer({
  open,
  productId,
  onClose,
  onEdit,
  onProductDeleted,
}: ProductViewDrawerProps) {
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
      title="Product Details"
      open={open}
      onClose={onClose}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setProduct(null);
          setLoading(true);
        }
      }}
      placement="bottom"
      size="75vh"
      styles={{
        body: { padding: 16, overflow: "auto" },
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : product ? (
        <Space orientation="vertical" style={{ width: "100%" }} size={16}>
          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
            <Space wrap>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {product.name}
              </Typography.Title>
              <Tag color={product.stock > 0 ? "blue" : "red"}>
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </Tag>
            </Space>
            <Typography.Text type="secondary">{product.sku}</Typography.Text>
          </Space>

          <Descriptions
            bordered
            column={1}
            size="small"
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

          <Space style={{ width: "100%" }} orientation="vertical">
            <Button
              type="primary"
              icon={<EditOutlined />}
              block
              onClick={onEdit}
            >
              Edit Product
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              block
              onClick={handleDelete}
              loading={deleting}
            >
              Delete Product
            </Button>
          </Space>
        </Space>
      ) : (
        <Typography.Text type="secondary">Product not found.</Typography.Text>
      )}
    </Drawer>
  );
}

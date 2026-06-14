"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Switch,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";

type ProductFormValues = {
  sku: string;
  name: string;
  unit?: string;
  jarCost?: number;
  piecesPerJar?: number;
  jarsInStock?: number;
  description?: string;
  cost?: number;
  markupPercent?: number;
  bundleQty?: number | null;
  bundleMarkdownPercent?: number | null;
  bundlePrice?: number | null;
  price: number;
  stock: number;
};

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
};

type ProductEditDrawerProps = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onProductUpdated: (product: ApiProduct) => void;
};

export function ProductEditDrawer({
  open,
  productId,
  onClose,
  onProductUpdated,
}: ProductEditDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skuEditable, setSkuEditable] = useState(false);
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(0);

  const cost = Form.useWatch("cost", form);
  const markupPercent = Form.useWatch("markupPercent", form);
  const unitValue = Form.useWatch("unit", form);
  const jarCost = Form.useWatch("jarCost", form);
  const piecesPerJar = Form.useWatch("piecesPerJar", form);
  const jarsInStock = Form.useWatch("jarsInStock", form);
  const bundleQty = Form.useWatch("bundleQty", form);
  const bundleMarkdownPercent = Form.useWatch("bundleMarkdownPercent", form);
  const priceValue = Form.useWatch("price", form);
  const normalizedUnit = (unitValue ?? "").trim().toUpperCase();
  const isContainerUnit = normalizedUnit === "JAR" || normalizedUnit === "CASE";
  const containerLabel = normalizedUnit === "CASE" ? "Case" : "Jar";

  const calculatedPrice = useMemo(() => {
    const baseCost = Number(cost ?? 0);
    const markup = Number(markupPercent ?? 0);

    if (Number.isNaN(baseCost) || Number.isNaN(markup)) {
      return null;
    }
    if (baseCost < 0 || markup < 0) {
      return null;
    }

    return Number((baseCost * (1 + markup / 100)).toFixed(2));
  }, [cost, markupPercent]);

  useEffect(() => {
    const loadSettings = async () => {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        globalMarkupPercent?: number;
      };
      const markup = Number(data.globalMarkupPercent ?? 0);
      setGlobalMarkupPercent(markup);
      const currentMarkup = form.getFieldValue("markupPercent");
      if (!currentMarkup || currentMarkup === 0) {
        form.setFieldsValue({ markupPercent: markup });
      }
    };

    void loadSettings();
  }, [form]);

  useEffect(() => {
    if (calculatedPrice === null) {
      return;
    }

    form.setFieldValue("price", calculatedPrice);
  }, [calculatedPrice, form]);

  useEffect(() => {
    if (!isContainerUnit) {
      return;
    }

    const totalJarCost = Number(jarCost ?? 0);
    const pieces = Number(piecesPerJar ?? 0);

    if (
      Number.isNaN(totalJarCost) ||
      totalJarCost <= 0 ||
      Number.isNaN(pieces) ||
      pieces <= 0
    ) {
      return;
    }

    const pieceCost = Number((totalJarCost / pieces).toFixed(2));
    form.setFieldValue("cost", pieceCost);
  }, [isContainerUnit, jarCost, piecesPerJar, form]);

  useEffect(() => {
    if (!isContainerUnit) {
      return;
    }

    const pieces = Number(piecesPerJar ?? 0);
    const jars = Number(jarsInStock ?? 0);

    if (Number.isNaN(pieces) || pieces <= 0 || Number.isNaN(jars) || jars < 0) {
      return;
    }

    form.setFieldValue("stock", Math.round(jars * pieces));
  }, [isContainerUnit, jarsInStock, piecesPerJar, form]);

  useEffect(() => {
    if (!bundleEnabled) {
      return;
    }

    const qty = Number(bundleQty);
    const markdown = Number(bundleMarkdownPercent ?? 0);
    const unitPrice = Number(priceValue ?? 0);

    if (
      Number.isNaN(qty) ||
      qty < 2 ||
      Number.isNaN(markdown) ||
      markdown < 0 ||
      markdown > 100 ||
      Number.isNaN(unitPrice) ||
      unitPrice < 0
    ) {
      return;
    }

    const regularTotal = qty * unitPrice;
    const nextBundlePrice = Number(
      (regularTotal * (1 - markdown / 100)).toFixed(2),
    );
    form.setFieldValue("bundlePrice", nextBundlePrice);
  }, [bundleEnabled, bundleQty, bundleMarkdownPercent, priceValue, form]);

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
          throw new Error("Failed to load product");
        }

        const product = (await response.json()) as ApiProduct;
        const hasBundleData =
          product.bundleQty !== null && product.bundleQty > 0;
        setBundleEnabled(hasBundleData);

        form.setFieldsValue({
          sku: product.sku,
          name: product.name,
          unit: product.unit ?? "",
          jarCost: Number(product.cost ?? 0),
          jarsInStock: product.stock,
          description: product.description ?? "",
          cost: Number(product.cost ?? 0),
          markupPercent: Number(product.markupPct ?? 0),
          bundleQty: product.bundleQty,
          bundleMarkdownPercent:
            product.bundleMarkdownPct === null
              ? null
              : Number(product.bundleMarkdownPct),
          bundlePrice:
            product.bundlePrice === null ? null : Number(product.bundlePrice),
          price: Number(product.price),
          stock: product.stock,
        });
      } catch (error) {
        console.error(error);
        message.error("Unable to load product details.");
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [open, productId, form, message]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setSubmitting(true);

      const normalizedBundleQty = bundleEnabled
        ? (values.bundleQty ?? null)
        : null;
      const normalizedBundleMarkdownPercent = bundleEnabled
        ? (values.bundleMarkdownPercent ?? null)
        : null;
      const normalizedBundlePrice = bundleEnabled
        ? (values.bundlePrice ?? null)
        : null;

      if (
        bundleEnabled &&
        (normalizedBundleQty === null || normalizedBundlePrice === null)
      ) {
        message.error(
          "Bundle quantity and bundle price are required when bundle pricing is enabled.",
        );
        return;
      }

      if (isContainerUnit) {
        const totalJarCost = Number(values.jarCost ?? 0);
        const pieces = Number(values.piecesPerJar ?? 0);
        const jars = Number(values.jarsInStock ?? 0);

        if (
          Number.isNaN(totalJarCost) ||
          totalJarCost <= 0 ||
          Number.isNaN(pieces) ||
          pieces <= 0 ||
          Number.isNaN(jars) ||
          jars < 0
        ) {
          message.error(
            "For JAR/CASE items, container cost, pieces per container, and containers in stock are required.",
          );
          return;
        }
      }

      const computedStock = isContainerUnit
        ? Math.round(
            Number(values.jarsInStock ?? 0) * Number(values.piecesPerJar ?? 0),
          )
        : values.stock;
      const computedUnit = isContainerUnit
        ? "PCS"
        : (values.unit?.trim() ?? "");

      const payload = {
        sku: values.sku,
        name: values.name,
        unit: computedUnit,
        description: values.description,
        cost: values.cost ?? 0,
        markupPercent: values.markupPercent ?? 0,
        bundleQty: normalizedBundleQty,
        bundleMarkdownPercent: normalizedBundleMarkdownPercent,
        bundlePrice: normalizedBundlePrice,
        price: values.price,
        stock: computedStock,
      };

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to update product");
      }

      const updatedProduct = (await response.json()) as ApiProduct;
      message.success("Product updated successfully.");
      onProductUpdated(updatedProduct);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update product";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Edit Product"
      open={open}
      onClose={onClose}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.resetFields();
          setSkuEditable(false);
          setBundleEnabled(false);
          setLoading(true);
        }
      }}
      placement="bottom"
      size="90vh"
      styles={{
        body: { padding: 16, overflow: "auto" },
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Form<ProductFormValues>
          form={form}
          layout="vertical"
          onFinish={onSubmit}
        >
          <Form.Item
            label="SKU"
            name="sku"
            rules={[{ required: true, message: "SKU is required" }]}
          >
            <Input
              placeholder="e.g., CAT-BRD-VAR-SZ"
              disabled={!skuEditable}
              suffix={
                <Button
                  type="text"
                  size="small"
                  onClick={() => setSkuEditable(!skuEditable)}
                >
                  {skuEditable ? "Done" : "Edit"}
                </Button>
              }
            />
          </Form.Item>

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Product name is required" }]}
          >
            <Input placeholder="e.g., Samsung Galaxy S24" />
          </Form.Item>

          <Form.Item label="Unit" name="unit">
            <Input placeholder="e.g., pcs, box, kg" />
          </Form.Item>

          {isContainerUnit ? (
            <>
              <Form.Item
                label={`${containerLabel} Cost`}
                name="jarCost"
                rules={[
                  {
                    required: true,
                    message: `${containerLabel} cost is required`,
                  },
                  {
                    pattern: /^\d+(\.\d{1,2})?$/,
                    message: `Invalid ${containerLabel.toLowerCase()} cost`,
                  },
                ]}
              >
                <InputNumber
                  prefix="₱"
                  placeholder={`Total cost per ${containerLabel.toLowerCase()}`}
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>

              <Form.Item
                label={`Pieces Per ${containerLabel}`}
                name="piecesPerJar"
                rules={[
                  {
                    required: true,
                    message: `Pieces per ${containerLabel.toLowerCase()} is required`,
                  },
                  {
                    pattern: /^\d+$/,
                    message: "Must be a whole number",
                  },
                ]}
              >
                <InputNumber
                  placeholder="e.g., 12"
                  min={1}
                  step={1}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                label={`${containerLabel}s In Stock`}
                name="jarsInStock"
                rules={[
                  {
                    required: true,
                    message: `${containerLabel}s in stock is required`,
                  },
                  {
                    pattern: /^\d+$/,
                    message: "Must be a whole number",
                  },
                ]}
              >
                <InputNumber
                  placeholder="e.g., 5"
                  min={0}
                  step={1}
                  precision={0}
                />
              </Form.Item>
            </>
          ) : null}

          <Form.Item label="Description" name="description">
            <Input.TextArea
              placeholder="Optional product description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Cost"
            name="cost"
            rules={[
              { required: true, message: "Cost is required" },
              { pattern: /^\d+(\.\d{1,2})?$/, message: "Invalid cost" },
            ]}
          >
            <InputNumber
              prefix="₱"
              disabled={isContainerUnit}
              placeholder="0.00"
              min={0}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            label={`Markup % (Global default: ${globalMarkupPercent.toFixed(2)}%)`}
            name="markupPercent"
            rules={[
              { required: true, message: "Markup % is required" },
              {
                pattern: /^\d+(\.\d{1,2})?$/,
                message: "Invalid markup percentage",
              },
            ]}
          >
            <InputNumber
              suffix="%"
              placeholder="0.00"
              min={0}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            label="Price"
            name="price"
            rules={[{ required: true, message: "Price is required" }]}
          >
            <InputNumber
              prefix="₱"
              placeholder="0.00"
              min={0}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            label="Stock"
            name="stock"
            rules={[{ required: true, message: "Stock is required" }]}
          >
            <InputNumber
              placeholder="0"
              min={0}
              step={1}
              precision={0}
              disabled={isContainerUnit}
            />
          </Form.Item>

          <Form.Item label="Enable Bundle Pricing">
            <Switch checked={bundleEnabled} onChange={setBundleEnabled} />
          </Form.Item>

          {bundleEnabled && (
            <>
              <Form.Item
                label="Bundle Quantity"
                name="bundleQty"
                rules={[
                  {
                    required: bundleEnabled,
                    message: "Bundle quantity is required",
                  },
                  {
                    pattern: /^\d+$/,
                    message: "Must be a whole number",
                  },
                ]}
              >
                <InputNumber
                  placeholder="e.g., 12"
                  min={2}
                  step={1}
                  precision={0}
                />
              </Form.Item>

              <Form.Item
                label="Bundle Markdown %"
                name="bundleMarkdownPercent"
                rules={[
                  {
                    pattern: /^\d+(\.\d{1,2})?$/,
                    message: "Invalid percentage",
                  },
                ]}
              >
                <InputNumber
                  suffix="%"
                  placeholder="0.00"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>

              <Form.Item
                label="Bundle Price"
                name="bundlePrice"
                rules={[
                  {
                    required: bundleEnabled,
                    message: "Bundle price is required",
                  },
                ]}
              >
                <InputNumber
                  prefix="₱"
                  placeholder="Auto-calculated"
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </>
          )}

          <Space style={{ width: "100%" }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              block
            >
              Save Changes
            </Button>
            <Button block onClick={onClose}>
              Cancel
            </Button>
          </Space>
        </Form>
      )}
    </Drawer>
  );
}

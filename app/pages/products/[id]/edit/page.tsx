"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Layout,
  Skeleton,
  Space,
  Switch,
  Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useThemeMode } from "@/components/providers/theme-provider";

const { Header, Content } = Layout;

type ProductFormValues = {
  sku: string;
  name: string;
  unit?: string;
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

export default function EditProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { mode } = useThemeMode();
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skuEditable, setSkuEditable] = useState(false);
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(0);
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const cost = Form.useWatch("cost", form);
  const markupPercent = Form.useWatch("markupPercent", form);
  const bundleQty = Form.useWatch("bundleQty", form);
  const bundleMarkdownPercent = Form.useWatch("bundleMarkdownPercent", form);
  const priceValue = Form.useWatch("price", form);

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
      try {
        setLoadingGlobalMarkup(true);
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          globalMarkupPercent?: number;
        };
        const markup = Number(data.globalMarkupPercent ?? 0);
        setGlobalMarkupPercent(markup);
        // Pre-populate with global markup value if form is empty
        const currentMarkup = form.getFieldValue("markupPercent");
        if (!currentMarkup || currentMarkup === 0) {
          form.setFieldsValue({ markupPercent: markup });
        }
      } finally {
        setLoadingGlobalMarkup(false);
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
        form.setFieldsValue({
          sku: product.sku,
          name: product.name,
          unit: product.unit ?? "",
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

    if (productId) {
      void loadProduct();
    }
  }, [form, message, productId]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setSubmitting(true);

      const payload = {
        sku: values.sku,
        name: values.name,
        unit: values.unit,
        description: values.description,
        cost: values.cost ?? 0,
        markupPercent: values.markupPercent ?? 0,
        bundleQty: bundleEnabled ? (values.bundleQty ?? null) : null,
        bundleMarkdownPercent: bundleEnabled
          ? (values.bundleMarkdownPercent ?? null)
          : null,
        bundlePrice: bundleEnabled ? Number(values.bundlePrice ?? 0) : null,
        price: values.price,
        stock: values.stock,
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

      message.success("Product updated successfully.");
      router.push("/pages/");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update product";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
          paddingInline: 12,
          paddingTop: "max(env(safe-area-inset-top), 8px)",
          minHeight: "calc(56px + env(safe-area-inset-top))",
        }}
      >
        <Space>
          <Link href="/pages/">
            <Button icon={<ArrowLeftOutlined />} type="text" size="large">
              Back
            </Button>
          </Link>
          <Typography.Title
            level={5}
            style={{
              margin: 0,
              color: mode === "dark" ? "#e5e7eb" : "#12325a",
            }}
          >
            Edit Product
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{
          paddingTop: 12,
          paddingInline: 12,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Card>
          <Form<ProductFormValues>
            form={form}
            layout="vertical"
            onFinish={onSubmit}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 7 }} />
            ) : (
              <>
                <Form.Item
                  label={
                    <Space size={8}>
                      <span>SKU</span>
                      <Switch
                        size="small"
                        checked={skuEditable}
                        onChange={(checked) => setSkuEditable(checked)}
                      />
                      <Typography.Text type="secondary">
                        Unlock edit
                      </Typography.Text>
                    </Space>
                  }
                  name="sku"
                  rules={[{ required: true, message: "Please enter SKU" }]}
                >
                  <Input disabled={!skuEditable} placeholder="e.g. MILK-001" />
                </Form.Item>

                <Form.Item
                  label="Name"
                  name="name"
                  rules={[
                    { required: true, message: "Please enter product name" },
                  ]}
                >
                  <Input placeholder="e.g. Fresh Milk" />
                </Form.Item>

                <Form.Item label="Description" name="description">
                  <Input.TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="Optional details"
                  />
                </Form.Item>

                <Form.Item label="Unit" name="unit">
                  <Input placeholder="e.g. PCS, PACK, BOT" />
                </Form.Item>

                <Form.Item label="Cost (Peso)" name="cost">
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    precision={2}
                    prefix="₱"
                  />
                </Form.Item>

                <Form.Item label="Markup (%)" name="markupPercent">
                  <Space style={{ width: "100%" }} wrap>
                    <InputNumber<number>
                      style={{ flex: 1, minWidth: 160 }}
                      min={0}
                      step={0.01}
                      precision={2}
                      value={markupPercent}
                      onChange={(value) =>
                        form.setFieldValue("markupPercent", value ?? 0)
                      }
                    />
                    {markupPercent !== globalMarkupPercent && (
                      <Button
                        onClick={() =>
                          form.setFieldValue(
                            "markupPercent",
                            globalMarkupPercent,
                          )
                        }
                        loading={loadingGlobalMarkup}
                        disabled={
                          loadingGlobalMarkup || globalMarkupPercent === 0
                        }
                        style={{ width: "100%" }}
                      >
                        Apply Global ({globalMarkupPercent.toFixed(2)}%)
                      </Button>
                    )}
                  </Space>
                </Form.Item>

                <Space
                  orientation="vertical"
                  size={4}
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  <Typography.Text type="secondary">
                    Formula: Selling Price = Cost × (1 + Markup % / 100)
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {calculatedPrice === null
                      ? "Enter valid cost and markup to calculate selling price"
                      : `Calculated selling price: ₱${calculatedPrice.toFixed(2)}`}
                  </Typography.Text>
                </Space>

                <Form.Item
                  label="Price (Peso)"
                  name="price"
                  rules={[{ required: true, message: "Please enter price" }]}
                >
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    precision={2}
                    prefix="₱"
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <Space size={8}>
                      <span>Enable Bundle Pricing</span>
                      <Switch
                        size="small"
                        checked={bundleEnabled}
                        onChange={(checked) => {
                          setBundleEnabled(checked);
                          if (checked) {
                            form.setFieldValue(
                              "bundlePrice",
                              Number(form.getFieldValue("bundlePrice") ?? 0),
                            );
                          } else {
                            form.setFieldValue("bundleQty", null);
                            form.setFieldValue("bundlePrice", 0);
                          }
                        }}
                      />
                    </Space>
                  }
                >
                  <Typography.Text type="secondary">
                    Toggle to show/hide bundle fields.
                  </Typography.Text>
                </Form.Item>

                {bundleEnabled ? (
                  <>
                    <Form.Item label="Bundle Quantity" name="bundleQty">
                      <InputNumber<number>
                        style={{ width: "100%" }}
                        min={2}
                        step={1}
                        placeholder="e.g. 2"
                        onChange={(value) => {
                          const qty = Number(value);
                          const markdown = Number(
                            form.getFieldValue("bundleMarkdownPercent") ?? 0,
                          );
                          const unitPrice = Number(
                            form.getFieldValue("price") ?? 0,
                          );

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
                        }}
                      />
                    </Form.Item>

                    <Form.Item label="Bundle Price" name="bundlePrice">
                      <InputNumber<number>
                        style={{ width: "100%" }}
                        min={0}
                        step={0.01}
                        precision={2}
                        prefix="₱"
                        placeholder="e.g. 3.00"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Promo Markdown (%)"
                      name="bundleMarkdownPercent"
                    >
                      <InputNumber<number>
                        style={{ width: "100%" }}
                        min={0}
                        max={100}
                        step={0.01}
                        precision={2}
                        placeholder="e.g. 25"
                      />
                    </Form.Item>

                    <Typography.Text
                      type="secondary"
                      style={{ marginBottom: 12 }}
                    >
                      Set both bundle fields to enable promo pricing (example:
                      qty 2 and price 3 means &quot;2 for ₱3&quot;).
                    </Typography.Text>
                  </>
                ) : null}

                <Form.Item
                  label="Stock"
                  name="stock"
                  rules={[{ required: true, message: "Please enter stock" }]}
                >
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={1}
                  />
                </Form.Item>

                <Button
                  htmlType="submit"
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  block
                >
                  Update Product
                </Button>
              </>
            )}
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}

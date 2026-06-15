"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Form,
  Grid,
  Input,
  InputNumber,
  Layout,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { STANDARD_UNITS, UNIT_LABELS } from "@/lib/units";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";
import { useCompactHeight } from "@/app/hooks/use-compact-height";
import {
  calculateSellingPrice,
  calculateBundlePrice,
} from "@/lib/price-calculator";

const { Header, Content } = Layout;

type ProductFormValues = {
  sku?: string;
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

async function generateAutoSku(
  productName: string,
  unit?: string,
): Promise<string> {
  const response = await fetch("/api/sku-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: productName, unit }),
  });

  if (!response.ok) {
    return "SKU-AUTO-GEN";
  }

  const data = (await response.json()) as { sku?: string };
  return data.sku || "SKU-AUTO-GEN";
}

export default function AddProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [skuEditable, setSkuEditable] = useState(false);
  const [autoSkuPreview, setAutoSkuPreview] = useState<string>("");
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(0);
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);
  const cost = Form.useWatch("cost", form);
  const markupPercent = Form.useWatch("markupPercent", form);
  const bundleQty = Form.useWatch("bundleQty", form);
  const bundleMarkdownPercent = Form.useWatch("bundleMarkdownPercent", form);
  const priceValue = Form.useWatch("price", form);
  const productName = Form.useWatch("name", form);
  const productUnit = Form.useWatch("unit", form);

  const calculatedPrice = useMemo(() => {
    const baseCost = Number(cost ?? 0);
    const markup = Number(markupPercent ?? 0);

    if (Number.isNaN(baseCost) || Number.isNaN(markup)) {
      return null;
    }
    if (baseCost < 0 || markup < 0) {
      return null;
    }

    return calculateSellingPrice(baseCost, markup);
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
        form.setFieldsValue({ markupPercent: markup });
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

    const nextBundlePrice = calculateBundlePrice(unitPrice, qty, markdown);
    form.setFieldValue("bundlePrice", nextBundlePrice);
  }, [bundleEnabled, bundleQty, bundleMarkdownPercent, priceValue, form]);

  useEffect(() => {
    if (!productName || skuEditable) {
      return;
    }

    const generatePreview = async () => {
      const sku = await generateAutoSku(productName, productUnit);
      setAutoSkuPreview(sku);
    };

    void generatePreview();
  }, [productName, productUnit, skuEditable]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setSubmitting(true);

      const finalSku = values.sku || autoSkuPreview || "AUTO-GEN";

      const payload = {
        sku: finalSku,
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

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to add product");
      }

      message.success("Product added successfully.");
      router.push("/pages/");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add product";
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
            Add Product
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{
          paddingTop: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingInline: isDesktop ? 18 : isCompactHeight ? 10 : 12,
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
            initialValues={{
              stock: 0,
              price: 0,
              cost: 0,
              markupPercent: undefined,
              bundleQty: null,
              bundleMarkdownPercent: null,
              bundlePrice: null,
            }}
          >
            <Form.Item
              label={
                <Space size={8}>
                  <span>SKU</span>
                  {!skuEditable && autoSkuPreview && (
                    <Typography.Text type="secondary" code>
                      {autoSkuPreview}
                    </Typography.Text>
                  )}
                  <Switch
                    size="small"
                    checked={skuEditable}
                    onChange={(checked) => {
                      setSkuEditable(checked);
                    }}
                  />
                  <Typography.Text type="secondary">Override</Typography.Text>
                </Space>
              }
              name="sku"
            >
              <Input
                placeholder="Leave empty to auto-generate (e.g., HOM-TSH-BLK-377)"
                onChange={() => {}}
                disabled={!skuEditable}
              />
            </Form.Item>

            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter product name" }]}
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
              <Select
                placeholder="Select a unit"
                allowClear
                options={STANDARD_UNITS.map((unit) => ({
                  value: unit,
                  label: UNIT_LABELS[unit],
                }))}
              />
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
                      form.setFieldValue("markupPercent", globalMarkupPercent)
                    }
                    loading={loadingGlobalMarkup}
                    disabled={loadingGlobalMarkup || globalMarkupPercent === 0}
                    style={{ width: isDesktop ? "auto" : "100%" }}
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

                <Typography.Text type="secondary" style={{ marginBottom: 12 }}>
                  Set both bundle fields to enable promo pricing (example: qty 2
                  and price 3 means &quot;2 for ₱3&quot;).
                </Typography.Text>
              </>
            ) : null}

            <Form.Item
              label="Stock"
              name="stock"
              rules={[{ required: true, message: "Please enter stock" }]}
            >
              <InputNumber<number> style={{ width: "100%" }} min={0} step={1} />
            </Form.Item>

            <Button
              htmlType="submit"
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              loading={submitting}
              block
            >
              Save Product
            </Button>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}

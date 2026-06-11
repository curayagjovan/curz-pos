"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Layout,
  Space,
  Switch,
  Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;

type ProductFormValues = {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
};

function createSkuFromName(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base || "PRODUCT"}-001`;
}

export default function AddProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [skuEditable, setSkuEditable] = useState(false);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to add product");
      }

      message.success("Product added successfully.");
      router.push("/");
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
          borderBottom: "1px solid #d8e3f2",
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 2,
          paddingInline: 16,
        }}
      >
        <Space>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />} type="text">
              Back
            </Button>
          </Link>
          <Typography.Title level={4} style={{ margin: 0, color: "#12325a" }}>
            Add Product
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{ padding: 14, maxWidth: 720, width: "100%", margin: "0 auto" }}
      >
        <Card>
          <Form<ProductFormValues>
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{ stock: 0, price: 0 }}
          >
            <Form.Item
              label={
                <Space size={8}>
                  <span>SKU</span>
                  <Switch
                    size="small"
                    checked={skuEditable}
                    onChange={(checked) => {
                      setSkuEditable(checked);
                      if (!checked) {
                        setSkuManuallyEdited(false);
                      }
                    }}
                  />
                  <Typography.Text type="secondary">
                    Unlock edit
                  </Typography.Text>
                </Space>
              }
              name="sku"
              rules={[{ required: true, message: "Please enter SKU" }]}
            >
              <Input
                placeholder="e.g. MILK-001"
                onChange={() => setSkuManuallyEdited(true)}
                disabled={!skuEditable}
              />
            </Form.Item>

            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter product name" }]}
            >
              <Input
                placeholder="e.g. Fresh Milk"
                onChange={(event) => {
                  if (skuManuallyEdited) {
                    return;
                  }

                  form.setFieldValue(
                    "sku",
                    createSkuFromName(event.target.value),
                  );
                }}
              />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="Optional details"
              />
            </Form.Item>

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

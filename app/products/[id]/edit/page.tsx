"use client";

import { useEffect, useState } from "react";
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

const { Header, Content } = Layout;

type ProductFormValues = {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
};

type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number;
};

export default function EditProductPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skuEditable, setSkuEditable] = useState(false);

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
          description: product.description ?? "",
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

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to update product");
      }

      message.success("Product updated successfully.");
      router.push("/");
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
            Edit Product
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

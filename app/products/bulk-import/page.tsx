"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  App,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;

type CsvRow = {
  sku?: string;
  name?: string;
  description?: string;
  price?: string;
  stock?: string;
};

type ImportResult = {
  sku: string;
  success: boolean;
  message: string;
};

const SAMPLE_CSV = `sku,name,description,price,stock
MILK-001,Fresh Milk,2L Whole Milk,85.50,20
BREAD-001,Whole Wheat Bread,500g Loaf,45.00,15
BUTTER-001,Salted Butter,250g Pack,120.00,10
EGGS-001,Brown Eggs,1 Dozen,75.00,25
CHEESE-001,Cheddar Cheese,200g Block,150.00,12
`;

export default function BulkImportPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const columns = [
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Price (₱)", dataIndex: "price", key: "price" },
    { title: "Stock", dataIndex: "stock", key: "stock" },
  ];

  const resultColumns = [
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Status",
      dataIndex: "success",
      key: "success",
      render: (success: boolean) => (
        <Tag color={success ? "green" : "red"}>{success ? "✓" : "✗"}</Tag>
      ),
    },
    { title: "Message", dataIndex: "message", key: "message" },
  ];

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as CsvRow[]).filter(
          (row) => row.sku || row.name,
        );
        setCsvData(rows);
        setResults(null);
      },
      error: (error) => {
        message.error(`CSV parsing error: ${error.message}`);
      },
    });
    return false;
  };

  const onSubmit = async () => {
    if (csvData.length === 0) {
      message.warning("No data to import");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: csvData }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to import products");
      }

      const data = (await response.json()) as {
        results: ImportResult[];
      };
      setResults(data.results);
      message.success(
        `Import complete: ${data.results.filter((r) => r.success).length} successful`,
      );
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import products";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSample = () => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`,
    );
    element.setAttribute("download", "sample-products.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            Bulk Import Products
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{ padding: 14, maxWidth: 900, width: "100%", margin: "0 auto" }}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={18}>
          {/* Upload Card */}
          <Card>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Upload CSV File
              </Typography.Title>
              <Typography.Text type="secondary">
                CSV must have columns: name, price, stock (sku and description
                are optional). Existing SKU entries will add stock and refresh
                price.
              </Typography.Text>

              <Upload.Dragger
                accept=".csv"
                beforeUpload={handleFileUpload}
                maxCount={1}
              >
                <CloudUploadOutlined
                  style={{ fontSize: 32, color: "#0b6bcb" }}
                />
                <Typography.Title level={5} style={{ margin: "8px 0 0" }}>
                  Click or drag CSV file here
                </Typography.Title>
              </Upload.Dragger>

              <Button
                icon={<DownloadOutlined />}
                onClick={downloadSample}
                block
              >
                Download Sample CSV
              </Button>
            </Space>
          </Card>

          {/* Preview Card */}
          {csvData.length > 0 && !results && (
            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Preview ({csvData.length} rows)
                </Typography.Title>
                <Table
                  columns={columns}
                  dataSource={csvData.map((row, idx) => ({
                    ...row,
                    key: idx,
                  }))}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />

                <Button
                  type="primary"
                  size="large"
                  onClick={onSubmit}
                  loading={submitting}
                  block
                >
                  Import {csvData.length} Product(s)
                </Button>
              </Space>
            </Card>
          )}

          {/* Results Card */}
          {results && (
            <Card>
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <Typography.Text strong>Success</Typography.Text>
                      <Typography.Title
                        level={2}
                        style={{
                          margin: "4px 0 0",
                          color: "#52c41a",
                        }}
                      >
                        {results.filter((r) => r.success).length}
                      </Typography.Title>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <Typography.Text strong>Failed</Typography.Text>
                      <Typography.Title
                        level={2}
                        style={{
                          margin: "4px 0 0",
                          color: "#ff4d4f",
                        }}
                      >
                        {results.filter((r) => !r.success).length}
                      </Typography.Title>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ textAlign: "center" }}>
                      <Typography.Text strong>Total</Typography.Text>
                      <Typography.Title
                        level={2}
                        style={{
                          margin: "4px 0 0",
                          color: "#0b6bcb",
                        }}
                      >
                        {results.length}
                      </Typography.Title>
                    </Card>
                  </Col>
                </Row>

                <Table
                  columns={resultColumns}
                  dataSource={results.map((row, idx) => ({
                    ...row,
                    key: idx,
                  }))}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />

                <Button type="primary" onClick={() => router.push("/")} block>
                  Back to POS
                </Button>
              </Space>
            </Card>
          )}
        </Space>
      </Content>
    </Layout>
  );
}

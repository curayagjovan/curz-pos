"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  FloatButton,
  Grid,
  Layout,
  Progress,
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
import { useThemeMode } from "@/components/providers/theme-provider";
import { useCompactHeight } from "@/hooks/use-compact-height";

const { Header, Content } = Layout;

type CsvRow = {
  name?: string;
  unit?: string;
  price?: string;
  stock?: string;
};

type ImportResult = {
  sku: string;
  success: boolean;
  message: string;
};

const SAMPLE_CSV = `name,unit,price,stock
Fresh Milk,PACK,85.50,20
Whole Wheat Bread,PACK,45.00,15
Salted Butter,PACK,120.00,10
Brown Eggs,PCS,75.00,25
Cheddar Cheese,PACK,150.00,12
`;

export default function BulkImportPage() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<
    "normal" | "success" | "exception"
  >("normal");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(0);
  const [loadingGlobalMarkup, setLoadingGlobalMarkup] = useState(true);

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
        setGlobalMarkupPercent(Number(data.globalMarkupPercent ?? 0));
      } finally {
        setLoadingGlobalMarkup(false);
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    if (!submitting) {
      return;
    }

    const timer = window.setInterval(() => {
      setImportProgress((current) => {
        if (current >= 90) {
          return current;
        }
        return current + 5;
      });
    }, 180);

    return () => {
      window.clearInterval(timer);
    };
  }, [submitting]);

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const checkIfFileDuplicate = (hash: string): boolean => {
    const storedHashes = localStorage.getItem("importedFileHashes");
    if (!storedHashes) return false;

    try {
      const hashes = JSON.parse(storedHashes) as string[];
      return hashes.includes(hash);
    } catch {
      return false;
    }
  };

  const addToImportHistory = (hash: string) => {
    try {
      const storedHashes = localStorage.getItem("importedFileHashes");
      const hashes = storedHashes ? JSON.parse(storedHashes) : [];
      if (!hashes.includes(hash)) {
        hashes.push(hash);
        localStorage.setItem("importedFileHashes", JSON.stringify(hashes));
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Unit", dataIndex: "unit", key: "unit" },
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
    void (async () => {
      try {
        // Calculate file hash
        const hash = await calculateFileHash(file);
        setFileHash(hash);

        // Check if this file was already imported
        const isDuplicate = checkIfFileDuplicate(hash);

        if (isDuplicate) {
          modal.confirm({
            title: "Duplicate File Detected",
            content:
              "This file appears to have been imported before. Importing it again will add duplicate stock quantities. Do you want to continue?",
            okText: "Continue Import",
            cancelText: "Cancel",
            okButtonProps: { danger: true },
            onOk() {
              Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  const rows = (results.data as CsvRow[]).filter(
                    (row) => row.name,
                  );
                  setCsvData(rows);
                  setResults(null);
                  setImportProgress(0);
                  setImportStatus("normal");
                },
                error: (error) => {
                  message.error(`CSV parsing error: ${error.message}`);
                },
              });
            },
            onCancel() {
              message.info("Upload cancelled. Please select a different file.");
              setFileHash(null);
            },
          });
        } else {
          // Parse the file normally
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = (results.data as CsvRow[]).filter((row) => row.name);
              setCsvData(rows);
              setResults(null);
              setImportProgress(0);
              setImportStatus("normal");
            },
            error: (error) => {
              message.error(`CSV parsing error: ${error.message}`);
            },
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to read file";
        message.error(`Error processing file: ${errorMsg}`);
        setFileHash(null);
      }
    })();
    return false;
  };

  const onSubmit = async () => {
    if (csvData.length === 0) {
      message.warning("No data to import");
      return;
    }

    try {
      setSubmitting(true);
      setImportStatus("normal");
      setImportProgress(10);
      const controller = new AbortController();
      setAbortController(controller);

      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: csvData,
          markupPercent: 0,
          filterType: "all",
          filterValue: "",
          fileHash,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Failed to import products");
      }

      const data = (await response.json()) as {
        results: ImportResult[];
      };
      setImportProgress(100);
      setImportStatus("success");
      setResults(data.results);

      // Track this file as imported
      if (fileHash) {
        addToImportHistory(fileHash);
      }

      message.success(
        `Import complete: ${data.results.filter((r) => r.success).length} successful`,
      );
      setTimeout(() => {
        router.push("/pages/");
        router.refresh();
      }, 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setImportProgress(0);
        setImportStatus("normal");
        message.warning("Import cancelled.");
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to import products";
      setImportStatus("exception");
      setImportProgress(100);
      message.error(errorMessage);
    } finally {
      setAbortController(null);
      setSubmitting(false);
    }
  };

  const onCancelImport = () => {
    if (!abortController) {
      return;
    }

    abortController.abort();
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
          <Link href="/">
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
            Bulk Import Products
          </Typography.Title>
        </Space>
      </Header>

      <Content
        style={{
          paddingTop: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingInline: isDesktop ? 18 : isCompactHeight ? 10 : 12,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Space
          orientation="vertical"
          style={{ width: "100%" }}
          size={isCompactHeight ? 12 : 18}
        >
          {/* Upload Card */}
          <Card>
            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
              <Alert
                type="info"
                showIcon
                message="Check Global Markup Before Import"
                description={
                  <>
                    Current global markup is
                    {loadingGlobalMarkup
                      ? " loading..."
                      : ` ${globalMarkupPercent.toFixed(2)}%`}
                    . To change it, open the markup tool in{" "}
                    <Link href="/pages/settings/product#global-markup-tool">
                      Settings
                    </Link>
                    .
                  </>
                }
              />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Upload CSV File
              </Typography.Title>
              <Typography.Text type="secondary">
                CSV must have columns: name, unit, price, stock. SKU and
                description are optional. If SKU is missing, the app
                auto-generates it.
              </Typography.Text>

              <Upload.Dragger
                accept=".csv"
                beforeUpload={handleFileUpload}
                maxCount={1}
                disabled={submitting}
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
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
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

                {(submitting || importProgress > 0) && (
                  <Space
                    orientation="vertical"
                    style={{ width: "100%" }}
                    size={6}
                  >
                    <Typography.Text type="secondary">
                      {submitting ? "Importing products..." : "Import finished"}
                    </Typography.Text>
                    <Progress
                      percent={importProgress}
                      status={importStatus}
                      strokeColor="#0b6bcb"
                    />
                  </Space>
                )}

                <Button
                  type="primary"
                  size="large"
                  onClick={onSubmit}
                  loading={submitting}
                  disabled={submitting}
                  block
                >
                  Import {csvData.length} Product(s)
                </Button>
                {submitting ? (
                  <Button danger onClick={onCancelImport} block>
                    Cancel Import
                  </Button>
                ) : null}
              </Space>
            </Card>
          )}

          {/* Results Card */}
          {results && (
            <Card>
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
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

                <Button
                  type="primary"
                  onClick={() => router.push("/pages/")}
                  block
                >
                  Back to POS
                </Button>
              </Space>
            </Card>
          )}
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

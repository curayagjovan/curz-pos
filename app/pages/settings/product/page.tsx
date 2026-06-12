"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  App,
  Button,
  Card,
  Col,
  FloatButton,
  Grid,
  Input,
  InputNumber,
  Layout,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/components/providers/theme-provider";
import { useCompactHeight } from "@/hooks/use-compact-height";
import { SettingsDropdown } from "@/components/settings/settings-dropdown";

const { Header, Content } = Layout;

export default function ProductSettingsPage() {
  const { message } = App.useApp();
  const { mode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [markupFilterType, setMarkupFilterType] = useState<
    "all" | "unit" | "category" | "productType"
  >("all");
  const [markupFilterValue, setMarkupFilterValue] = useState("");
  const [applyingMarkup, setApplyingMarkup] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load settings.");
        }

        const data = (await response.json()) as {
          globalMarkupPercent?: number;
          globalMarkupFilterType?: "all" | "unit" | "category" | "productType";
          globalMarkupFilterValue?: string;
        };

        setMarkupPercent(Number(data.globalMarkupPercent ?? 0));
        setMarkupFilterType(data.globalMarkupFilterType ?? "all");
        setMarkupFilterValue(data.globalMarkupFilterValue ?? "");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load settings.";
        message.error(errorMessage);
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [message]);

  const applyGlobalMarkup = async () => {
    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      message.error("Markup must be 0 or higher.");
      return;
    }

    if (markupFilterType !== "all" && !markupFilterValue.trim()) {
      message.error("Please provide a filter value.");
      return;
    }

    try {
      setApplyingMarkup(true);

      const saveResponse = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeMode: mode,
          globalMarkupPercent: markupPercent,
          globalMarkupFilterType: markupFilterType,
          globalMarkupFilterValue: markupFilterValue,
        }),
      });

      const saveData = (await saveResponse.json()) as { message?: string };
      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Failed to save settings.");
      }

      const response = await fetch("/api/products/markup-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markupPercent,
          filterType: markupFilterType,
          filterValue: markupFilterValue,
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply markup.");
      }

      message.success(data.message || "Global markup updated.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to apply markup.";
      message.error(errorMessage);
    } finally {
      setApplyingMarkup(false);
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
            Product Settings
          </Typography.Title>
        </Space>
        <SettingsDropdown size={isDesktop ? "middle" : "large"} />
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
          <Card>
            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Product Actions
              </Typography.Title>
              <Typography.Text type="secondary">
                Quickly manage your product catalog.
              </Typography.Text>
              <Space wrap>
                <Link href="/pages/products/add">
                  <Button icon={<PlusOutlined />} type="default">
                    Add Single Product
                  </Button>
                </Link>
                <Link href="/pages/products/bulk-import">
                  <Button icon={<UploadOutlined />}>Bulk Import</Button>
                </Link>
              </Space>
            </Space>
          </Card>

          <Card>
            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Global Markup Tool
              </Typography.Title>
              <Typography.Text
                id="global-markup-tool"
                type="secondary"
                style={{ display: "block" }}
              >
                Apply markup to all products, or filter by unit, category
                keyword, or product type keyword.
              </Typography.Text>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Markup (%)</Typography.Text>
                  <InputNumber<number>
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    precision={2}
                    value={markupPercent}
                    onChange={(value) => setMarkupPercent(value ?? 0)}
                    disabled={loadingSettings}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">
                    Filter Type
                  </Typography.Text>
                  <Select
                    style={{ width: "100%" }}
                    value={markupFilterType}
                    onChange={(value) => setMarkupFilterType(value)}
                    disabled={loadingSettings}
                    options={[
                      { label: "All Products", value: "all" },
                      { label: "Unit", value: "unit" },
                      { label: "Category Keyword", value: "category" },
                      { label: "Product Type Keyword", value: "productType" },
                    ]}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">
                    {markupFilterType === "unit"
                      ? "Unit"
                      : markupFilterType === "all"
                        ? "Filter Value (not needed)"
                        : "Keyword"}
                  </Typography.Text>
                  <Input
                    placeholder={
                      markupFilterType === "unit"
                        ? "e.g. PCS"
                        : markupFilterType === "all"
                          ? "Not required"
                          : "e.g. coffee"
                    }
                    value={markupFilterValue}
                    onChange={(event) =>
                      setMarkupFilterValue(event.target.value)
                    }
                    disabled={loadingSettings || markupFilterType === "all"}
                  />
                </Col>
              </Row>

              <Button
                type="primary"
                loading={applyingMarkup}
                disabled={loadingSettings}
                onClick={() => {
                  void applyGlobalMarkup();
                }}
                block
                style={{ marginTop: 16 }}
              >
                Apply Global Markup
              </Button>
            </Space>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  App,
  Button,
  Card,
  FloatButton,
  Grid,
  Layout,
  Space,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/components/providers/theme-provider";
import { useCompactHeight } from "@/hooks/use-compact-height";
import { SettingsDropdown } from "@/components/settings/settings-dropdown";

const { Header, Content } = Layout;

export default function GeneralSettingsPage() {
  const { message } = App.useApp();
  const { mode, setMode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();
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
          themeMode?: "light" | "dark";
        };

        if (data.themeMode === "light" || data.themeMode === "dark") {
          setMode(data.themeMode);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load settings.";
        message.error(errorMessage);
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [message, setMode]);

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
            General Settings
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
                App Settings
              </Typography.Title>
              <Typography.Text type="secondary">
                Configure application-wide preferences
              </Typography.Text>

              <div style={{ paddingTop: 12 }}>
                <Typography.Text strong>Theme</Typography.Text>
                <Space style={{ marginTop: 12 }} wrap>
                  <Button
                    size={isDesktop ? "middle" : "large"}
                    type={mode === "light" ? "primary" : "default"}
                    icon={<SunOutlined />}
                    onClick={() => setMode("light")}
                    disabled={loadingSettings}
                  >
                    Light Mode
                  </Button>
                  <Button
                    size={isDesktop ? "middle" : "large"}
                    type={mode === "dark" ? "primary" : "default"}
                    icon={<MoonOutlined />}
                    onClick={() => setMode("dark")}
                    disabled={loadingSettings}
                  >
                    Dark Mode
                  </Button>
                </Space>
              </div>
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

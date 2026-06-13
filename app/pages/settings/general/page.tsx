"use client";

import Link from "next/link";
import {
  Button,
  Card,
  Col,
  FloatButton,
  Grid,
  Layout,
  Row,
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
  const { mode, setMode } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const isCompactHeight = useCompactHeight();

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

              <Card
                size="small"
                styles={{ body: { padding: isDesktop ? 16 : 12 } }}
                style={{
                  background:
                    mode === "dark"
                      ? "rgba(15, 23, 42, 0.45)"
                      : "rgba(248, 250, 252, 0.9)",
                  borderColor: mode === "dark" ? "#334155" : "#dbeafe",
                }}
              >
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size={10}
                >
                  <Typography.Text
                    strong
                    style={{ color: mode === "dark" ? "#e5e7eb" : "#0f172a" }}
                  >
                    Theme
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Switch between light and dark appearance.
                  </Typography.Text>

                  <Row gutter={[10, 10]}>
                    <Col xs={24} sm={12}>
                      <Button
                        size={isDesktop ? "middle" : "large"}
                        type={mode === "light" ? "primary" : "default"}
                        icon={<SunOutlined />}
                        onClick={() => setMode("light")}
                        block
                      >
                        Light Mode
                      </Button>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Button
                        size={isDesktop ? "middle" : "large"}
                        type={mode === "dark" ? "primary" : "default"}
                        icon={<MoonOutlined />}
                        onClick={() => setMode("dark")}
                        block
                      >
                        Dark Mode
                      </Button>
                    </Col>
                  </Row>
                </Space>
              </Card>
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

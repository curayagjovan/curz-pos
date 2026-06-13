"use client";

import Link from "next/link";
import { Button, Card, Col, Layout, Row, Space, Typography } from "antd";
import {
  ArrowLeftOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/components/providers/theme-provider";
import { SettingsDropdown } from "@/components/settings/settings-dropdown";

const { Header, Content } = Layout;

export default function GeneralSettingsPage() {
  const { mode, setMode } = useThemeMode();

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
            General Settings
          </Typography.Title>
        </Space>
        <SettingsDropdown size="large" />
      </Header>

      <Content
        style={{
          paddingTop: 12,
          paddingInline: 12,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={18}>
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
                styles={{ body: { padding: 12 } }}
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
                        size="large"
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
                        size="large"
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
    </Layout>
  );
}

"use client";

import Link from "next/link";
import { Button, Card, Layout, Space, Typography } from "antd";

const { Content } = Layout;

export default function OfflinePage() {
  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Content
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          padding: "24px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card style={{ width: "100%" }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              You are offline
            </Typography.Title>
            <Typography.Text type="secondary">
              Your network connection appears to be unavailable. You can still
              use cached pages, then retry once you are back online.
            </Typography.Text>
            <Space wrap>
              <Link href="/pages/">
                <Button type="primary">Go to POS</Button>
              </Link>
              <Link href="/offline">
                <Button>Retry</Button>
              </Link>
            </Space>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}

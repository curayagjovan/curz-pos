"use client";

import { Button, Card, Space, Tag, Toast } from "antd-mobile";

export default function Page() {
  return (
    <main className="app-shell">
      <div className="app-center app-mobile-width">
        <Space direction="vertical" block>
          <Tag color="primary" fill="outline">
            Ant Design Mobile Ready
          </Tag>

          <Card title="CURZ POS">
            <p className="app-copy">
              Ant Design Mobile is installed and configured for this project.
            </p>
            <Button
              color="primary"
              block
              onClick={() => {
                Toast.show("Ant Design Mobile is working");
              }}
            >
              Test Component
            </Button>
          </Card>
        </Space>
      </div>
    </main>
  );
}

import { Button, Card, Col, Empty, Space, Spin, Typography } from "antd";

type ThemeMode = "light" | "dark";

type ProductsLoadingStateProps = {
  mode: ThemeMode;
};

type ProductsLoadErrorStateProps = {
  error: string;
  onRetry: () => void;
};

export function ProductsLoadingState({ mode }: ProductsLoadingStateProps) {
  return (
    <>
      <Col xs={24}>
        <Card
          style={{
            borderStyle: "dashed",
            borderColor: mode === "dark" ? "#334155" : "#bfdbfe",
            background:
              mode === "dark"
                ? "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))"
                : "linear-gradient(135deg, #eff6ff, #f8fafc)",
          }}
        >
          <Space
            align="center"
            size={12}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <Spin size="large" />
            <Space orientation="vertical" size={2}>
              <Typography.Text strong>Loading products...</Typography.Text>
              <Typography.Text type="secondary">
                Preparing your inventory list.
              </Typography.Text>
            </Space>
          </Space>
        </Card>
      </Col>
      {Array.from({ length: 4 }).map((_, idx) => (
        <Col xs={24} sm={12} xl={8} key={`loading-${idx}`}>
          <Card loading />
        </Col>
      ))}
    </>
  );
}

export function ProductsLoadErrorState({
  error,
  onRetry,
}: ProductsLoadErrorStateProps) {
  return (
    <Col xs={24}>
      <Card>
        <Space orientation="vertical" style={{ width: "100%" }} size={10}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <Button onClick={onRetry}>Retry Loading Products</Button>
        </Space>
      </Card>
    </Col>
  );
}

export function ProductsEmptyState() {
  return (
    <Col xs={24}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <Empty description="No Products" style={{ marginTop: "20px" }}>
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: "16px" }}
          >
            Add products to your database and they will appear here.
          </Typography.Text>
          <Button type="primary" href="/pages/settings/product">
            Add Product
          </Button>
        </Empty>
      </div>
    </Col>
  );
}

export function ProductsLoadingMoreState() {
  return (
    <Col xs={24}>
      <Card size="small">
        <Space align="center" size={10} style={{ width: "100%" }}>
          <Spin size="small" />
          <Typography.Text type="secondary">
            Fetching more products...
          </Typography.Text>
        </Space>
      </Card>
    </Col>
  );
}

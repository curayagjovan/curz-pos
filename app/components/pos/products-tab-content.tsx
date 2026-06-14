"use client";

import { Card, Space, Typography, Button, Col, Row, Empty, Spin } from "antd";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List as VirtualList } from "react-window";
import {
  ProductRow,
  LIST_ROW_GAP,
  LIST_ROW_HEIGHT,
  type Product,
} from "@/app/components/pos/product-row";

interface ProductsTabContentProps {
  mode: "light" | "dark";
  isCompactHeight: boolean;
  products: Product[];
  loadingProducts: boolean;
  productsLoadError: string | null;
  loadingMoreProducts: boolean;
  hasMoreProducts: boolean;
  virtualListContainerHeight: string;
  virtualListFallbackHeight: number;
  overscanRows: number;
  onAddToCart: (product: Product, quantity: number) => void;
  onViewProduct: (productId: string) => void;
  onRetry: () => void;
  onRowsRendered: (info: { stopIndex: number }) => void;
}

export function ProductsTabContent({
  mode,
  isCompactHeight,
  products,
  loadingProducts,
  productsLoadError,
  loadingMoreProducts,
  hasMoreProducts,
  virtualListContainerHeight,
  virtualListFallbackHeight,
  overscanRows,
  onAddToCart,
  onViewProduct,
  onRetry,
  onRowsRendered,
}: ProductsTabContentProps) {
  return (
    <Space
      orientation="vertical"
      size={isCompactHeight ? 6 : 12}
      style={{ width: "100%" }}
    >
      <Card
        style={{
          borderRadius: 16,
          border: mode === "dark" ? "1px solid #273244" : "1px solid #d0dff4",
          background:
            mode === "dark"
              ? "linear-gradient(150deg, rgba(17,24,39,0.96), rgba(15,23,42,0.9))"
              : "linear-gradient(150deg, #ffffff, #f3f8ff)",
          boxShadow:
            mode === "dark"
              ? "0 4px 16px rgba(0,0,0,0.28)"
              : "0 4px 16px rgba(16,40,90,0.07)",
        }}
        styles={{
          body: {
            padding: isCompactHeight ? 12 : 16,
          },
        }}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography.Text
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: mode === "dark" ? "#e2e8f0" : "#1a3055",
                letterSpacing: "0.01em",
              }}
            >
              Products
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{
                fontSize: 11,
                background: mode === "dark" ? "rgba(51,65,85,0.7)" : "#eef3fb",
                border:
                  mode === "dark" ? "1px solid #334155" : "1px solid #d0dff4",
                borderRadius: 999,
                padding: "2px 10px",
              }}
            >
              {products.length} items
            </Typography.Text>
          </div>
        </Space>
      </Card>

      <Row gutter={[10, 10]}>
        {loadingProducts ? (
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
        ) : null}
        {loadingProducts
          ? Array.from({ length: 4 }).map((_, idx) => (
              <Col xs={24} sm={12} xl={8} key={`loading-${idx}`}>
                <Card loading />
              </Col>
            ))
          : null}
        {!loadingProducts && productsLoadError ? (
          <Col xs={24}>
            <Card>
              <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                <Typography.Text type="danger">
                  {productsLoadError}
                </Typography.Text>
                <Button onClick={onRetry}>Retry Loading Products</Button>
              </Space>
            </Card>
          </Col>
        ) : null}
        {!loadingProducts && !productsLoadError && products.length === 0 ? (
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
        ) : null}
        {!loadingProducts && !productsLoadError ? (
          <Col xs={24}>
            <div
              style={{
                height: virtualListContainerHeight,
                width: "100%",
                overflow: "hidden",
                borderRadius: 14,
                border:
                  mode === "dark"
                    ? "1px solid rgba(51, 65, 85, 0.9)"
                    : "1px solid rgba(214, 225, 241, 0.95)",
                background:
                  mode === "dark"
                    ? "linear-gradient(180deg, rgba(15,23,42,0.7), rgba(15,23,42,0.52))"
                    : "linear-gradient(180deg, rgba(250,252,255,0.9), rgba(242,247,255,0.9))",
                padding: 6,
              }}
            >
              <AutoSizer
                renderProp={({
                  width,
                  height,
                }: {
                  width: number | undefined;
                  height: number | undefined;
                }) => (
                  <VirtualList
                    style={{
                      width: Math.max(width ?? 1, 1),
                      height: Math.max(height ?? virtualListFallbackHeight, 1),
                    }}
                    rowCount={products.length}
                    rowHeight={LIST_ROW_HEIGHT + LIST_ROW_GAP}
                    overscanCount={overscanRows}
                    rowComponent={ProductRow}
                    rowProps={{
                      products,
                      onAddToCart,
                      onViewProduct,
                    }}
                    onRowsRendered={onRowsRendered}
                  />
                )}
              />
            </div>
          </Col>
        ) : null}
        {loadingMoreProducts && !loadingProducts ? (
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
        ) : null}
      </Row>
    </Space>
  );
}

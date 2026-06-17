"use client";

import { useRef, useState, type TouchEvent } from "react";
import { Card, Space, Typography, Button, Empty } from "antd";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List as VirtualList, type RowComponentProps } from "react-window";
import {
  ProductRow,
  LIST_ROW_GAP,
  LIST_ROW_HEIGHT,
  type Product,
} from "@/app/components/pos/product-row";

type ProductVirtualRowProps = {
  products: Product[];
  mode: "light" | "dark";
  loadingMoreProducts: boolean;
  onAddToCart: (product: Product, quantity: number) => void;
  onViewProduct?: (productId: string) => void;
  onLongPressProduct?: (productId: string) => void;
};

function ProductVirtualRow({
  ariaAttributes,
  index,
  style,
  products,
  mode,
  loadingMoreProducts,
  onAddToCart,
  onViewProduct,
  onLongPressProduct,
}: RowComponentProps<ProductVirtualRowProps>) {
  if (loadingMoreProducts && index === products.length) {
    const parsedTop =
      typeof style.top === "number"
        ? style.top
        : Number.parseFloat(String(style.top ?? "0"));
    const parsedHeight =
      typeof style.height === "number"
        ? style.height
        : Number.parseFloat(String(style.height ?? String(LIST_ROW_HEIGHT)));
    const safeTop = Number.isFinite(parsedTop) ? parsedTop : 0;
    const safeHeight = Number.isFinite(parsedHeight)
      ? parsedHeight
      : LIST_ROW_HEIGHT;

    return (
      <div
        style={{
          ...style,
          top: safeTop + LIST_ROW_GAP / 2,
          height: Math.max(safeHeight - LIST_ROW_GAP, 0),
        }}
      >
        <Card
          className="pos-product-card"
          loading
          style={{
            height: `${LIST_ROW_HEIGHT}px`,
            borderRadius: 16,
            border: mode === "dark" ? "1px solid #2a3548" : "1px solid #dbe4f0",
            background:
              mode === "dark"
                ? "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(17,24,39,0.92) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,250,255,0.94) 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <ProductRow
      ariaAttributes={ariaAttributes}
      index={index}
      style={style}
      products={products}
      onAddToCart={onAddToCart}
      onViewProduct={onViewProduct}
      onLongPressProduct={onLongPressProduct}
    />
  );
}

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
  onLongPressProduct: (productId: string) => void;
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
  virtualListContainerHeight,
  virtualListFallbackHeight,
  overscanRows,
  onAddToCart,
  onViewProduct,
  onLongPressProduct,
  onRetry,
  onRowsRendered,
}: ProductsTabContentProps) {
  const PULL_TRIGGER_PX = 72;
  const PULL_MAX_PX = 108;
  const pullContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const canPullRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const getListElement = () =>
    pullContainerRef.current?.querySelector(
      '[role="list"]',
    ) as HTMLElement | null;

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (loadingProducts || loadingMoreProducts) {
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    const listElement = getListElement();
    canPullRef.current = !listElement || listElement.scrollTop <= 0;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!canPullRef.current || touchStartYRef.current === null) {
      return;
    }

    const listElement = getListElement();
    if (listElement && listElement.scrollTop > 0) {
      canPullRef.current = false;
      if (pullDistance > 0) {
        setPullDistance(0);
      }
      return;
    }

    const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
    const delta = currentY - touchStartYRef.current;
    if (delta <= 0) {
      if (pullDistance > 0) {
        setPullDistance(0);
      }
      return;
    }

    const dampedDistance = Math.min(PULL_MAX_PX, delta * 0.42);
    setPullDistance(dampedDistance);
    event.preventDefault();
  };

  const handleTouchEnd = () => {
    const shouldRefresh =
      canPullRef.current && pullDistance >= PULL_TRIGGER_PX && !loadingProducts;

    touchStartYRef.current = null;
    canPullRef.current = false;
    setPullDistance(0);

    if (shouldRefresh) {
      onRetry();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: virtualListContainerHeight,
        display: "flex",
        flexDirection: "column",
        gap: isCompactHeight ? 6 : 12,
        minHeight: 0,
      }}
    >
      {loadingProducts
        ? Array.from({ length: 4 }).map((_, idx) => <Card key={idx} loading />)
        : null}
      {!loadingProducts && productsLoadError ? (
        <Card className="ui-surface pos-empty-surface">
          <Space orientation="vertical" style={{ width: "100%" }} size={10}>
            <Typography.Text type="danger">{productsLoadError}</Typography.Text>
            <Button onClick={onRetry}>Retry Loading Products</Button>
          </Space>
        </Card>
      ) : null}
      {!loadingProducts && !productsLoadError && products.length === 0 ? (
        <div
          className="pos-empty-surface"
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
            <Button type="primary" href="/pages/products/add">
              Add Product
            </Button>
          </Empty>
        </div>
      ) : null}
      {!loadingProducts && !productsLoadError ? (
        <div
          ref={pullContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ flex: 1, minHeight: 0, position: "relative" }}
        >
          {pullDistance > 0 ? (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 0,
                right: 0,
                zIndex: 2,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Typography.Text
                type="secondary"
                style={{
                  background:
                    mode === "dark"
                      ? "rgba(15, 23, 42, 0.86)"
                      : "rgba(255, 255, 255, 0.92)",
                  border:
                    mode === "dark"
                      ? "1px solid rgba(71, 85, 105, 0.7)"
                      : "1px solid rgba(191, 219, 254, 0.95)",
                  borderRadius: 999,
                  padding: "4px 10px",
                }}
              >
                {pullDistance >= PULL_TRIGGER_PX
                  ? "Release to refresh"
                  : "Pull down to refresh"}
              </Typography.Text>
            </div>
          ) : null}

          <div
            style={{
              height: "100%",
              transform: `translateY(${pullDistance}px)`,
              transition:
                pullDistance === 0 ? "transform 160ms ease-out" : "none",
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
                  rowCount={products.length + (loadingMoreProducts ? 1 : 0)}
                  rowHeight={LIST_ROW_HEIGHT + LIST_ROW_GAP}
                  overscanCount={overscanRows}
                  rowComponent={ProductVirtualRow}
                  rowProps={{
                    products,
                    mode,
                    loadingMoreProducts,
                    onAddToCart,
                    onViewProduct,
                    onLongPressProduct,
                  }}
                  onRowsRendered={onRowsRendered}
                />
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

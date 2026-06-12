import { useState } from "react";
import { useRouter } from "next/navigation";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag, Typography } from "antd";
import { type RowComponentProps } from "react-window";
import { useThemeMode } from "@/components/providers/theme-provider";

export const LIST_ROW_GAP = 10;
export const LIST_ROW_HEIGHT = 154;

export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
  stock: number;
};

export type ProductRowProps = {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
};

export function ProductRow({
  index,
  style,
  products,
  onAddToCart,
}: RowComponentProps<ProductRowProps>) {
  const router = useRouter();
  const { mode } = useThemeMode();
  const product = products[index];
  const [quantity, setQuantity] = useState(1);
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

  if (!product) {
    return <div style={style} />;
  }

  const maxQuantity = Math.max(product.stock, 1);
  const selectedQuantity = Math.min(Math.max(quantity, 1), maxQuantity);
  const isOutOfStock = product.stock <= 0;
  const stockColor =
    product.stock <= 0 ? "#b91c1c" : product.stock <= 5 ? "#b45309" : "#0f766e";
  const stockLabel =
    product.stock <= 0
      ? "Out of stock"
      : product.stock <= 5
        ? `Low stock: ${product.stock}`
        : `In stock: ${product.stock}`;
  const isDark = mode === "dark";

  return (
    <div
      style={{
        ...style,
        top: safeTop + LIST_ROW_GAP / 2,
        height: Math.max(safeHeight - LIST_ROW_GAP, 0),
      }}
    >
      <Card
        hoverable
        style={{
          height: `${LIST_ROW_HEIGHT}px`,
          cursor: "pointer",
          borderRadius: 16,
          border: isDark ? "1px solid #2a3548" : "1px solid #dbe4f0",
          boxShadow: isDark
            ? "0 8px 24px rgba(3, 10, 20, 0.36)"
            : "0 8px 24px rgba(16, 24, 40, 0.06)",
          background: isDark
            ? "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(17,24,39,0.92) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,250,255,0.94) 100%)",
        }}
        styles={{ body: { padding: 10, height: "100%" } }}
        onClick={() => router.push(`/pages/products/${product.id}`)}
      >
        <div
          style={{
            height: "100%",
            display: "grid",
            gridTemplateRows: "auto auto auto",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Space orientation="vertical" size={1} style={{ minWidth: 0 }}>
              <Typography.Paragraph
                style={{
                  margin: 0,
                  fontFamily: "var(--font-inter), sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.15,
                  color: isDark ? "#f3f4f6" : "#0f172a",
                }}
                ellipsis={{ rows: 1 }}
              >
                {product.name}
              </Typography.Paragraph>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, color: isDark ? "#93a4bc" : undefined }}
              >
                SKU {product.sku}
              </Typography.Text>
            </Space>
            <Tag
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 10,
                lineHeight: "16px",
                paddingInline: 8,
                color: stockColor,
                borderColor: `${stockColor}33`,
                background: `${stockColor}14`,
              }}
            >
              {stockLabel}
            </Tag>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Typography.Text
              strong
              style={{
                fontFamily: "var(--font-roboto), sans-serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "0.01em",
                color: isDark ? "#90caf9" : "#0f3f77",
              }}
            >
              ₱{product.price.toFixed(2)}
            </Typography.Text>
            {product.bundleQty && product.bundlePrice !== null ? (
              <Tag
                style={{
                  marginInlineEnd: 0,
                  borderRadius: 999,
                  border: isDark ? "1px solid #355783" : "1px solid #b7d7ff",
                  background: isDark ? "#11253b" : "#edf5ff",
                  color: isDark ? "#9cc8ff" : "#114d96",
                  fontWeight: 600,
                  fontSize: 10,
                  lineHeight: "16px",
                  paddingInline: 8,
                }}
              >
                Bundle {product.bundleQty} for ₱{product.bundlePrice.toFixed(2)}
              </Tag>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "102px 1fr",
              gap: 6,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: isDark ? "1px solid #334155" : "1px solid #d0dbe8",
                borderRadius: 10,
                background: isDark ? "#0f172a" : "#ffffff",
                padding: "2px 6px",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                icon={<MinusOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  setQuantity((current) => Math.max(current - 1, 1));
                }}
                size="small"
                style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
                disabled={isOutOfStock || selectedQuantity <= 1}
              />
              <Typography.Text
                strong
                style={{ minWidth: 20, textAlign: "center", fontSize: 13 }}
              >
                {selectedQuantity}
              </Typography.Text>
              <Button
                icon={<PlusOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  setQuantity((current) => Math.min(current + 1, maxQuantity));
                }}
                size="small"
                style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
                disabled={isOutOfStock || selectedQuantity >= maxQuantity}
              />
            </div>

            <Button
              type="primary"
              block
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart(product, selectedQuantity);
              }}
              disabled={isOutOfStock}
              style={{
                height: "100%",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Button, Card, Space, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { type RowComponentProps } from "react-window";

export const LIST_ROW_GAP = 32;
export const LIST_ROW_HEIGHT = 200;

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
  deletingId: string | null;
  addToCart: (product: Product) => void;
  deleteProduct: (productId: string) => void;
};

export function ProductRow({
  index,
  style,
  products,
  deletingId,
  addToCart,
  deleteProduct,
}: RowComponentProps<ProductRowProps>) {
  const product = products[index];
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

  return (
    <div
      style={{
        ...style,
        top: safeTop + LIST_ROW_GAP / 2,
        height: Math.max(safeHeight - LIST_ROW_GAP, 0),
      }}
    >
      <Card
        style={{ height: `${LIST_ROW_HEIGHT}px` }}
      >
        <Space orientation="vertical">
          <Typography.Title level={4} style={{ margin: 0 }}>
            {product.name} <Tag>{product.sku}</Tag>
          </Typography.Title>
          <Typography.Text strong>₱{product.price.toFixed(2)}</Typography.Text>
          {product.bundleQty && product.bundlePrice !== null ? (
            <Typography.Text type="secondary">
              {product.bundleQty} for ₱{product.bundlePrice.toFixed(2)}
            </Typography.Text>
          ) : null}
          <Typography.Text type="secondary">
            Stock: {product.stock}
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { type RowComponentProps } from "react-window";

export const LIST_ROW_GAP = 32;
export const LIST_ROW_HEIGHT = 250;

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

  return (
    <div
      style={{
        ...style,
        top: safeTop + LIST_ROW_GAP / 2,
        height: Math.max(safeHeight - LIST_ROW_GAP, 0),
      }}
    >
      <Card style={{ height: `${LIST_ROW_HEIGHT}px` }}>
        <Flex orientation="vertical" gap={8}>
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
          <Flex orientation="vertical" style={{ width: "100%" }} gap={8}>
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #d0d7e2",
                borderRadius: 10,
                padding: "6px 8px",
              }}
            >
              <Button
                icon={<MinusOutlined />}
                onClick={() =>
                  setQuantity((current) => Math.max(current - 1, 1))
                }
                size="small"
                disabled={isOutOfStock || selectedQuantity <= 1}
              />
              <Typography.Text
                strong
                style={{ minWidth: 24, textAlign: "center" }}
              >
                {selectedQuantity}
              </Typography.Text>
              <Button
                icon={<PlusOutlined />}
                onClick={() =>
                  setQuantity((current) => Math.min(current + 1, maxQuantity))
                }
                size="small"
                disabled={isOutOfStock || selectedQuantity >= maxQuantity}
              />
            </div>

            <Button
              type="primary"
              block
              onClick={() => onAddToCart(product, selectedQuantity)}
              disabled={isOutOfStock}
            >
              Add to Cart
            </Button>
          </Flex>
        </Flex>
      </Card>
    </div>
  );
}

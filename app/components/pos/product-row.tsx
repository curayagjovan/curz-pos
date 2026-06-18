import { useEffect, useRef, useState } from "react";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag, Typography } from "antd";
import { type RowComponentProps } from "react-window";
import { useThemeMode } from "@/app/components/providers/theme-provider";

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
  horizontalInset?: number;
  onAddToCart: (product: Product, quantity: number) => void;
  onViewProduct?: (productId: string) => void;
  onLongPressProduct?: (productId: string) => void;
};

export function ProductRow({
  index,
  style,
  products,
  horizontalInset = 0,
  onAddToCart,
  onViewProduct,
  onLongPressProduct,
}: RowComponentProps<ProductRowProps>) {
  const { mode } = useThemeMode();
  const product = products[index];
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [showLongPressPulse, setShowLongPressPulse] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
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

  useEffect(() => {
    if (!isAdding) {
      return;
    }

    const timer = window.setTimeout(() => setIsAdding(false), 420);
    return () => window.clearTimeout(timer);
  }, [isAdding]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showLongPressPulse) {
      return;
    }

    const timer = window.setTimeout(() => setShowLongPressPulse(false), 280);
    return () => window.clearTimeout(timer);
  }, [showLongPressPulse]);

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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    longPressTriggeredRef.current = false;
    setIsPressing(true);
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowLongPressPulse(true);
      onLongPressProduct?.(product.id);
    }, 450);
  };

  const handleCardPointerUp = () => {
    setIsPressing(false);
    clearLongPressTimer();
  };

  return (
    <div
      className="pos-product-touch-surface"
      onPointerDown={handleCardPointerDown}
      onPointerUp={handleCardPointerUp}
      onPointerCancel={handleCardPointerUp}
      onPointerLeave={handleCardPointerUp}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        ...style,
        left:
          ((typeof style.left === "number"
            ? style.left
            : Number.parseFloat(String(style.left ?? "0"))) || 0) +
          horizontalInset,
        width: `calc(100% - ${horizontalInset * 2}px)`,
        top: safeTop + LIST_ROW_GAP / 2,
        height: Math.max(safeHeight - LIST_ROW_GAP, 0),
      }}
    >
      <Card
        className={`pos-product-touch-surface rounded-[18px] transition-[transform,box-shadow,border-color] duration-180 will-change-transform hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${
          isPressing ? "scale-[0.995]" : ""
        } ${
          showLongPressPulse
            ? "animate-[long-press-haptic-pulse_260ms_cubic-bezier(0.22,1,0.36,1)]"
            : ""
        }`}
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
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }

          onViewProduct?.(product.id);
        }}
      >
        <div className="grid h-full grid-rows-[auto_auto_auto] gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <Space orientation="vertical" size={1} style={{ minWidth: 0 }}>
              <Typography.Paragraph
                className="text-[0.9rem] leading-[1.15] font-bold tracking-[-0.01em]"
                style={{
                  margin: 0,
                  color: isDark ? "#f3f4f6" : "#0f172a",
                }}
                ellipsis={{ rows: 1 }}
              >
                {product.name}
              </Typography.Paragraph>
              <Typography.Text
                className="text-[0.68rem] tracking-[0.03em] uppercase opacity-90"
                type="secondary"
                style={{ color: isDark ? "#93a4bc" : undefined }}
              >
                SKU {product.sku}
              </Typography.Text>
            </Space>
            <Tag
              className="rounded-full text-[0.64rem] font-bold tracking-[0.01em]"
              style={{
                marginInlineEnd: 0,
                borderRadius: 999,
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

          <div className="flex flex-wrap items-baseline gap-2">
            <Typography.Text
              className="text-[1.35rem] leading-none font-extrabold tracking-[-0.02em]"
              strong
              style={{
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

          <div className="grid grid-cols-[102px_1fr] gap-1.5">
            <div
              className="transition-[transform,box-shadow,border-color,background-color] duration-140 active:scale-96 motion-reduce:transform-none motion-reduce:transition-none"
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
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                icon={<MinusOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  setQuantity((current) => Math.max(current - 1, 1));
                }}
                size="small"
                className="h-6 min-h-6 w-6 min-w-6 p-0"
                disabled={isOutOfStock || selectedQuantity <= 1}
              />
              <Typography.Text
                strong
                className="min-w-5 text-center text-[13px]"
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
                className="h-6 min-h-6 w-6 min-w-6 p-0"
                disabled={isOutOfStock || selectedQuantity >= maxQuantity}
              />
            </div>

            <Button
              className={`h-full rounded-[10px] text-xs font-semibold transition-[transform,box-shadow,filter] duration-140 active:translate-y-px active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${
                isAdding ? "animate-[pos-add-pulse_420ms_ease-out]" : ""
              }`}
              type="primary"
              block
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setIsAdding(true);
                onAddToCart(product, selectedQuantity);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={isOutOfStock}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

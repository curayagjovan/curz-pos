"use client";

import {
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import {
  Button,
  Divider,
  Empty,
  InputNumber,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { TAX_ENABLED, TAX_RATE } from "@/lib/tax-config";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
  stock: number;
  quantity: number;
};

type CartContentProps = {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentAmount: number | null;
  setPaymentAmount: (value: number | null) => void;
  quickCashAmounts: number[];
  change: number;
  checkingOut: boolean;
  updateQty: (productId: string, delta: number) => void;
  onCheckout: () => void;
};

function getLineTotal(item: {
  quantity: number;
  price: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  if (
    item.bundleQty &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0
  ) {
    const bundles = Math.floor(item.quantity / item.bundleQty);
    const remainder = item.quantity % item.bundleQty;
    return Number(
      (bundles * item.bundlePrice + remainder * item.price).toFixed(2),
    );
  }

  return Number((item.quantity * item.price).toFixed(2));
}

function isBundleApplied(item: {
  quantity: number;
  bundleQty: number | null;
  bundlePrice: number | null;
}) {
  return (
    item.bundleQty !== null &&
    item.bundleQty >= 2 &&
    item.bundlePrice !== null &&
    item.bundlePrice >= 0 &&
    item.quantity >= item.bundleQty
  );
}

export function CartContent({
  cart,
  subtotal,
  tax,
  total,
  paymentAmount,
  setPaymentAmount,
  quickCashAmounts,
  change,
  checkingOut,
  updateQty,
  onCheckout,
}: CartContentProps) {
  return (
    <Space orientation="vertical" style={{ width: "100%" }} size={14}>
      <Space align="center">
        <ShoppingCartOutlined style={{ fontSize: 18, color: "#0b6bcb" }} />
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cart
        </Typography.Title>
      </Space>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cart.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "20px 0",
            }}
          >
            <Empty description="Cart Empty" style={{ margin: 0 }}>
              <Typography.Text type="secondary">
                No items added to cart yet
              </Typography.Text>
            </Empty>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography.Text strong>{item.name}</Typography.Text>
                <Typography.Text strong>
                  ₱{getLineTotal(item).toFixed(2)}
                </Typography.Text>
              </div>
              {isBundleApplied(item) ? (
                <Tag color="green">Bundle Applied</Tag>
              ) : null}
              <Typography.Text type="secondary">
                {item.quantity} x ₱{item.price.toFixed(2)}
              </Typography.Text>
              {item.bundleQty && item.bundlePrice !== null ? (
                <Typography.Text type="secondary">
                  Promo: {item.bundleQty} for ₱{item.bundlePrice.toFixed(2)}
                </Typography.Text>
              ) : null}
              <Typography.Text type="secondary">
                Available stock: {item.stock}
              </Typography.Text>
              <Space>
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => updateQty(item.id, -1)}
                  size="small"
                />
                <Typography.Text>{item.quantity}</Typography.Text>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => updateQty(item.id, 1)}
                  size="small"
                  disabled={item.stock <= item.quantity}
                />
              </Space>
            </div>
          ))
        )}
      </div>

      <Divider style={{ margin: "8px 0" }} />
      <Statistic title="Subtotal" value={subtotal} precision={2} prefix="₱" />
      {TAX_ENABLED ? (
        <Statistic
          title={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`}
          value={tax}
          precision={2}
          prefix="₱"
        />
      ) : null}
      <Statistic
        title="Grand Total"
        value={total}
        precision={2}
        prefix="₱"
        styles={{ content: { color: "#0b6bcb" } }}
      />

      <InputNumber<number>
        style={{ width: "100%" }}
        min={0}
        step={1}
        precision={2}
        prefix="₱"
        placeholder="Payment amount"
        value={paymentAmount ?? undefined}
        onChange={(value) => setPaymentAmount(value ?? null)}
      />

      <Space wrap>
        <Button onClick={() => setPaymentAmount(Number(total.toFixed(2)))}>
          Exact
        </Button>
        {quickCashAmounts.map((amount) => (
          <Button key={amount} onClick={() => setPaymentAmount(amount)}>
            ₱{amount}
          </Button>
        ))}
      </Space>

      <Statistic
        title="Change"
        value={Math.max(change, 0)}
        precision={2}
        prefix="₱"
        styles={{ content: { color: change >= 0 ? "#16a34a" : "#dc2626" } }}
      />
      {change < 0 ? (
        <Typography.Text type="danger">
          Insufficient payment by ₱{Math.abs(change).toFixed(2)}
        </Typography.Text>
      ) : null}

      <Button
        type="primary"
        size="large"
        loading={checkingOut}
        disabled={cart.length === 0 || paymentAmount === null || checkingOut}
        onClick={onCheckout}
      >
        Checkout
      </Button>
    </Space>
  );
}

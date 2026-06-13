"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { Badge, Card, Tabs } from "antd";

type BottomTabKey = "products" | "cart" | "transactions";

type MobilePosBottomBarProps = {
  mode: "light" | "dark";
  cartItemCount: number;
  activeTab?: BottomTabKey;
  onTabChange?: (tab: BottomTabKey) => void;
};

export function MobilePosBottomBar({
  mode,
  cartItemCount,
  activeTab = "products",
  onTabChange,
}: MobilePosBottomBarProps) {
  const [transitioningKey, setTransitioningKey] = useState<BottomTabKey | null>(
    null,
  );
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const items = useMemo(
    () => [
      {
        key: "products",
        label: (
          <span
            className={`mobile-pos-tab-label ${
              activeTab === "products" ? "mobile-pos-tab-label--active" : ""
            }`}
          >
            <span className="mobile-pos-tab-icon">
              <AppstoreOutlined />
            </span>
            <span className="mobile-pos-tab-text">Products</span>
          </span>
        ),
        children: null,
      },
      {
        key: "cart",
        label: (
          <span
            className={`mobile-pos-tab-label ${
              activeTab === "cart" ? "mobile-pos-tab-label--active" : ""
            }`}
          >
            <Badge count={cartItemCount} size="small" offset={[10, 1]}>
              <span className="mobile-pos-tab-icon">
                <ShoppingCartOutlined />
              </span>
            </Badge>
            <span className="mobile-pos-tab-text">Cart</span>
          </span>
        ),
        children: null,
      },
      {
        key: "transactions",
        label: (
          <span
            className={`mobile-pos-tab-label ${
              activeTab === "transactions" ? "mobile-pos-tab-label--active" : ""
            }`}
          >
            <span className="mobile-pos-tab-icon">
              <FileTextOutlined />
            </span>
            <span className="mobile-pos-tab-text">Transactions</span>
          </span>
        ),
        children: null,
      },
    ],
    [activeTab, cartItemCount],
  );

  return (
    <div
      className={`mobile-pos-bottom-affix-shell ${
        mode === "dark" ? "mobile-pos-bottom-affix-shell--dark" : ""
      }`}
      style={{ width: "100%" }}
    >
      <Card
        className={`mobile-pos-bottom-card ${
          mode === "dark" ? "mobile-pos-bottom-card--dark" : ""
        } ${transitioningKey ? "mobile-pos-bottom-card--transitioning" : ""}`}
        styles={{ body: { padding: 0 } }}
        style={{
          zIndex: 35,
          width: "calc(100% - 24px)",
          margin: "0 12px calc(8px + env(safe-area-inset-bottom))",
          borderRadius: 999,
          paddingInline: 0,
        }}
      >
        <Tabs
          className={`mobile-pos-bottom-tabs mobile-pos-bottom-tabs--ios ${
            mode === "dark" ? "mobile-pos-bottom-tabs--ios-dark" : ""
          }`}
          activeKey={activeTab}
          centered
          animated={false}
          items={items}
          onTabClick={(key) => {
            const nextKey = key as BottomTabKey;

            if (transitionTimerRef.current) {
              clearTimeout(transitionTimerRef.current);
            }

            setTransitioningKey(nextKey);

            if (nextKey === activeTab) {
              transitionTimerRef.current = setTimeout(() => {
                setTransitioningKey(null);
              }, 220);
              return;
            }

            onTabChange?.(nextKey);

            transitionTimerRef.current = setTimeout(() => {
              setTransitioningKey(null);
            }, 160);
          }}
          tabBarStyle={{ margin: 0, padding: "2px 8px 4px" }}
        />
      </Card>
    </div>
  );
}

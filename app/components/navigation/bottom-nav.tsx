"use client";

import { Tabs, theme } from "antd";
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";

export type BottomNavTabKey = "products" | "cart" | "transactions" | "settings";

interface TabItem {
  key: BottomNavTabKey;
  label: string;
  icon: React.ReactNode;
}

const TAB_ITEMS: TabItem[] = [
  {
    key: "products",
    label: "Products",
    icon: <AppstoreOutlined />,
  },
  {
    key: "cart",
    label: "Cart",
    icon: <ShoppingCartOutlined />,
  },
  {
    key: "transactions",
    label: "Transactions",
    icon: <FileTextOutlined />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
  },
];

type BottomNavProps = {
  activeTab: BottomNavTabKey;
  onTabChange: (tab: BottomNavTabKey) => void;
};

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { mode } = useThemeMode();
  const { token } = theme.useToken();

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        zIndex: 99,
      }}
    >
      <div
        style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background:
            mode === "dark" ? "rgba(17,24,39,0.98)" : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(10px)",
          paddingBottom: `calc(16px + env(safe-area-inset-bottom))`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "500px" }}>
          <Tabs
            className="bottom-nav-tabs"
            activeKey={activeTab}
            onChange={(key) => onTabChange(key as BottomNavTabKey)}
            items={TAB_ITEMS.map((item) => ({
              key: item.key,
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  {item.icon}
                  {item.label}
                </span>
              ),
            }))}
            style={{
              margin: 0,
            }}
            tabBarStyle={{
              margin: 0,
              padding: "0 16px",
              borderBottom: "none",
            }}
          />
        </div>
      </div>
      <style>{`
        .bottom-nav-tabs .ant-tabs-content-holder {
          display: none;
        }
        .bottom-nav-tabs .ant-tabs-nav {
          margin: 0 !important;
        }
        .bottom-nav-tabs .ant-tabs-nav-list {
          display: flex !important;
          justify-content: space-around !important;
          width: 100% !important;
          gap: 0 !important;
        }
        .bottom-nav-tabs .ant-tabs-tab {
          flex: 1 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin: 0 !important;
          padding: 8px 0 !important;
          text-align: center !important;
        }
        .bottom-nav-tabs .ant-tabs-tab-btn {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}

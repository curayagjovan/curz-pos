"use client";

import { Tabs, theme } from "antd";
import {
  AppstoreFilled,
  ShoppingFilled,
  FileTextFilled,
  SettingFilled,
} from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";

export type BottomNavTabKey = "products" | "cart" | "transactions" | "settings";

interface TabItem {
  key: BottomNavTabKey;
  title: string;
  icon: React.ReactNode;
}

const TAB_ITEMS: TabItem[] = [
  {
    key: "products",
    title: "Products",
    icon: <AppstoreFilled />,
  },
  {
    key: "cart",
    title: "Cart",
    icon: <ShoppingFilled />,
  },
  {
    key: "transactions",
    title: "Transactions",
    icon: <FileTextFilled />,
  },
  {
    key: "settings",
    title: "Settings",
    icon: <SettingFilled />,
  },
];

type BottomNavProps = {
  activeTab: BottomNavTabKey;
  isCompactHeight?: boolean;
  onTabChange: (tab: BottomNavTabKey) => void;
};

export function BottomNav({
  activeTab,
  isCompactHeight = false,
  onTabChange,
}: BottomNavProps) {
  const { mode } = useThemeMode();
  const { token } = theme.useToken();
  const navTopPadding = isCompactHeight ? 10 : 0;
  const navBottomPadding = isCompactHeight
    ? "calc(30px + env(safe-area-inset-bottom))"
    : "calc(23px + env(safe-area-inset-bottom))";
  const iconSize = isCompactHeight ? 24 : 22;
  const tabVerticalPadding = isCompactHeight ? 17 : 13;
  const tabMinHeight = isCompactHeight ? 58 : 48;

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
          paddingTop: navTopPadding,
          paddingBottom: navBottomPadding,
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
              title: item.title,
              label: (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {item.icon}
                </span>
              ),
            }))}
            style={{
              margin: 0,
            }}
            tabBarStyle={{
              margin: 0,
              padding: "0 10px",
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
        .bottom-nav-tabs .ant-tabs-nav::before {
          border-bottom: none !important;
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
          padding: ${tabVerticalPadding}px 0 !important;
          min-height: ${tabMinHeight}px !important;
          text-align: center !important;
        }
        .bottom-nav-tabs .ant-tabs-tab-btn {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
        }
        .bottom-nav-tabs .ant-tabs-tab-btn .anticon {
          font-size: ${iconSize}px;
        }
        .bottom-nav-tabs .ant-tabs-ink-bar {
          top: 0 !important;
          bottom: auto !important;
          height: 3px !important;
          border-radius: 999px !important;
        }
      `}</style>
    </div>
  );
}

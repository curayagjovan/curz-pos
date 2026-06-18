"use client";

import { useEffect, useState } from "react";
import { Input, theme } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useThemeMode } from "@/app/components/providers/theme-provider";

export type BottomNavTabKey = "products" | "cart" | "transactions" | "settings";

type BottomNavProps = {
  activeTab: BottomNavTabKey;
  isCompactHeight?: boolean;
  cartItemCount?: number;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onTabChange: (tab: BottomNavTabKey) => void;
};

export function BottomNav({
  activeTab: _activeTab,
  isCompactHeight = false,
  cartItemCount: _cartItemCount = 0,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onTabChange: _onTabChange,
}: BottomNavProps) {
  void _activeTab;
  void _cartItemCount;
  void _onTabChange;

  const { mode } = useThemeMode();
  const { token } = theme.useToken();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!showSearch || typeof window === "undefined") {
      return;
    }

    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;

      if (!viewport) {
        setKeyboardInset(0);
        return;
      }

      const nextInset = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop),
      );

      setKeyboardInset(nextInset);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
    };
  }, [showSearch]);

  const navTopPadding = 0;
  const navBottomPadding = isCompactHeight
    ? "calc(30px + env(safe-area-inset-bottom))"
    : "calc(23px + env(safe-area-inset-bottom))";
  const iconSize = isCompactHeight ? 24 : 22;
  const tabVerticalPadding = isCompactHeight ? 17 : 13;
  const tabMinHeight = isCompactHeight ? 58 : 48;
  const isFloatingSearch = showSearch && isSearchFocused && keyboardInset > 0;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: isFloatingSearch ? keyboardInset : 0,
        width: "100%",
        zIndex: 99,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          borderTop: isFloatingSearch
            ? "none"
            : `1px solid ${token.colorBorderSecondary}`,
          background: isFloatingSearch
            ? "transparent"
            : mode === "dark"
              ? "rgba(17,24,39,0.98)"
              : "rgba(255,255,255,0.98)",
          backdropFilter: isFloatingSearch ? "none" : "blur(10px)",
          paddingTop: isFloatingSearch ? 0 : navTopPadding,
          paddingBottom: isFloatingSearch ? 8 : navBottomPadding,
          overflow: "visible",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{ width: "100%", maxWidth: "500px", pointerEvents: "auto" }}
        >
          {showSearch ? (
            <div
              style={{
                padding: isFloatingSearch ? "0 14px" : "10px 14px 8px",
              }}
            >
              <Input
                prefix={<SearchOutlined />}
                className="rounded-4xl!"
                placeholder="Search by name or SKU..."
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                allowClear
                size="large"
                style={{
                  width: "100%",
                }}
              />
            </div>
          ) : null}
          {/* <Tabs
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
                  {item.key === "cart" && cartItemCount > 0 ? (
                    <Badge
                      count={cartItemCount}
                      size="small"
                      offset={[8, -10]}
                      styles={{
                        indicator: {
                          fontSize: 10,
                          minWidth: 16,
                          height: 16,
                          lineHeight: "16px",
                          padding: "0 4px",
                        },
                      }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
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
          /> */}
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
        .bottom-nav-tabs .ant-tabs-nav-wrap,
        .bottom-nav-tabs .ant-tabs-nav-list,
        .bottom-nav-tabs .ant-tabs-tab-btn {
          overflow: visible !important;
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

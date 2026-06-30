"use client";

import { useState, useLayoutEffect } from "react";
import { NavBar, Popover, List } from "antd-mobile";
import { MoreOutline } from "antd-mobile-icons";

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [isDark, setIsDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleMenuItemClick = (item: string) => {
    console.log(`Menu item clicked: ${item}`);
    setPopoverVisible(false);
  };

  const menuItems = [
    { label: "Transactions", key: "transactions" },
    { label: "Inventory", key: "inventory" },
    { label: "Settings", key: "settings" },
  ];

  const menuContent = (
    <List>
      {menuItems.map((item) => (
        <List.Item key={item.key} onClick={() => handleMenuItemClick(item.key)}>
          {item.label}
        </List.Item>
      ))}
    </List>
  );

  return (
    <header className="mobile-header">
      <NavBar
        back={null}
        right={
          <Popover
            content={menuContent}
            placement="bottom-end"
            visible={popoverVisible}
            onVisibleChange={setPopoverVisible}
            trigger="click"
            mode={isDark ? "dark" : "light"}
          >
            <button
              type="button"
              aria-label="More options"
              style={{ background: "transparent", border: 0 }}
            >
              <MoreOutline />
            </button>
          </Popover>
        }
      >
        {title}
      </NavBar>
    </header>
  );
}

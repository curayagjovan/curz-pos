"use client";

import { useLayoutEffect, useState } from "react";
import { usePageContext } from "@/app/context/page-context";
import { NavBar, Popover, Button, List } from "antd-mobile";
import { MoreOutline } from "antd-mobile-icons";

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const { currentPage, setCurrentPage } = usePageContext();
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

  const handleBackClick = () => {
    setCurrentPage("products");
  };

  const handleMenuItemClick = (item: string | number) => {
    setPopoverVisible(false);

    const pageMap: Record<string, "transactions" | "inventory" | "settings"> = {
      transactions: "transactions",
      inventory: "inventory",
      settings: "settings",
    };

    const page = pageMap[String(item)];
    if (page) {
      setCurrentPage(page);
    }
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
        back={currentPage !== "products" ? "" : null}
        onBack={handleBackClick}
        right={
          currentPage === "products" ? (
            <Popover
              content={menuContent}
              placement="bottom-end"
              visible={popoverVisible}
              onVisibleChange={setPopoverVisible}
              trigger="click"
              mode={isDark ? "dark" : "light"}
            >
              <Button fill="none">
                <MoreOutline />
              </Button>
            </Popover>
          ) : null
        }
      >
        {title}
      </NavBar>
    </header>
  );
}

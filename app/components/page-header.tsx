"use client";

import { useLayoutEffect, useState } from "react";
import { usePageContext } from "@/app/context/page-context";
import { NavBar, Popover, Button } from "antd-mobile";
import { MoreOutline } from "antd-mobile-icons";

type PageHeaderProps = {
  title: string;
};

type MenuItem = {
  key: string;
  text: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const { currentPage, setCurrentPage } = usePageContext();
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

  const menuActions: MenuItem[] = [
    { key: "transactions", text: "Transactions" },
    { key: "inventory", text: "Inventory" },
    { key: "settings", text: "Settings" },
  ];

  const handleMenuAction = (action: MenuItem | unknown) => {
    const item = action as MenuItem;
    const pageMap: Record<string, "transactions" | "inventory" | "settings"> = {
      transactions: "transactions",
      inventory: "inventory",
      settings: "settings",
    };

    if (item.key) {
      const page = pageMap[item.key];
      if (page) {
        setCurrentPage(page);
      }
    }
  };

  return (
    <header className="mobile-header">
      <NavBar
        back={currentPage !== "products" ? "" : null}
        onBack={handleBackClick}
        right={
          currentPage === "products" ? (
            <Popover.Menu
              mode={isDark ? "dark" : "light"}
              actions={menuActions}
              placement="bottom-end"
              onAction={handleMenuAction}
              trigger="click"
            >
              <Button fill="none">
                <MoreOutline />
              </Button>
            </Popover.Menu>
          ) : null
        }
      >
        {title}
      </NavBar>
    </header>
  );
}

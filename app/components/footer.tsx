"use client";

import { usePageContext } from "@/app/context/page-context";

type PageKey = "products" | "transactions" | "inventory" | "settings";

const tabs = [
  { key: "products" as PageKey, title: "Products" },
  { key: "transactions" as PageKey, title: "Sales" },
  { key: "inventory" as PageKey, title: "Inventory" },
  { key: "settings" as PageKey, title: "Settings" },
];

export default function Footer() {
  const { currentPage, setCurrentPage, setSearchQuery } = usePageContext();

  return (
    <nav
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        borderTop: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => {
            if (tab.key === currentPage) {
              return;
            }

            setCurrentPage(tab.key);
            setSearchQuery("");
          }}
          style={{
            border: "none",
            background: "transparent",
            padding: "12px 8px",
            fontSize: "12px",
            fontWeight: currentPage === tab.key ? 700 : 500,
            color: currentPage === tab.key ? "#111111" : "#6b7280",
          }}
        >
          {tab.title}
        </button>
      ))}
    </nav>
  );
}

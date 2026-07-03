"use client";

import { usePageContext } from "@/app/context/page-context";

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const { currentPage, setCurrentPage } = usePageContext();

  const handleBackClick = () => {
    setCurrentPage("products");
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      {currentPage !== "products" ? (
        <button
          type="button"
          onClick={handleBackClick}
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "4px 8px",
          }}
        >
          Back
        </button>
      ) : null}
      {title}
    </header>
  );
}

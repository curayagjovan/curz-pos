"use client";

import { usePageContext } from "@/app/context/page-context";
import { NavBar } from "antd-mobile";

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const { currentPage, setCurrentPage } = usePageContext();

  const handleBackClick = () => {
    setCurrentPage("products");
  };

  return (
    <NavBar
      back={currentPage !== "products" ? "" : null}
      onBack={handleBackClick}
    >
      {title}
    </NavBar>
  );
}

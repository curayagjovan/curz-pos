"use client";

import { type ReactNode } from "react";
import { Page } from "konsta/react";
import BottomSearchBar from "./bottom-search-bar";
import PageHeader from "./page-header";

type PageContainerProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
};

export default function PageContainer({
  children,
  title,
  subtitle,
  onSearch,
}: PageContainerProps) {
  return (
    <Page>
      <PageHeader title={title} subtitle={subtitle} />

      <main
        className="transition-opacity duration-500"
        style={{
          opacity: 1,
          visibility: "visible",
        }}
        aria-hidden={false}
      >
        {children}
      </main>
      <BottomSearchBar onSearch={onSearch} />
    </Page>
  );
}

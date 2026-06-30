"use client";

import PageHeader from "@/app/components/page-header";
import { SearchBar } from "antd-mobile";

type MobilePageWrapperProps = {
  title: string;
  children: React.ReactNode;
};

export default function MobilePageWrapper({
  title,
  children,
}: MobilePageWrapperProps) {
  return (
    <main className="mobile-app">
      <PageHeader title={title} />
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          backgroundColor: "var(--background)",
          borderTop: "1px solid var(--border)",
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}
      >
        <SearchBar placeholder="请输入内容" showCancelButton={() => true} />
      </div>
    </main>
  );
}

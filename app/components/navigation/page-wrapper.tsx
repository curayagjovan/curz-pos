import type { CSSProperties, ReactNode } from "react";
import { Layout } from "antd";
import { MobilePageHeader } from "@/app/components/navigation/mobile-page-header";
import {
  BottomNav,
  type BottomNavTabKey,
} from "@/app/components/navigation/bottom-nav";

const { Content } = Layout;

type PageWrapperProps = {
  mode: "light" | "dark";
  title?: string;
  children: ReactNode;
  contentStyle?: CSSProperties;
  isCompactHeight?: boolean;
  activeTab: BottomNavTabKey;
  onTabChange: (tab: BottomNavTabKey) => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

const defaultContentStyle: CSSProperties = {
  paddingTop: "var(--mobile-header-offset)",
  paddingInline: 12,
  paddingBottom: "var(--mobile-bottom-offset)",
  maxWidth: "100%",
  width: "100%",
  margin: "0 auto",
};

export function PageWrapper({
  mode,
  title,
  children,
  contentStyle,
  isCompactHeight = false,
  activeTab,
  onTabChange,
  showSearch = false,
  searchValue = "",
  onSearchChange,
}: PageWrapperProps) {
  const headerOffset = showSearch
    ? isCompactHeight
      ? "calc(116px + env(safe-area-inset-top))"
      : "calc(106px + env(safe-area-inset-top))"
    : isCompactHeight
      ? "calc(64px + env(safe-area-inset-top))"
      : "calc(56px + env(safe-area-inset-top))";

  const bottomOffset = isCompactHeight
    ? "calc(114px + env(safe-area-inset-bottom))"
    : "calc(98px + env(safe-area-inset-bottom))";

  return (
    <Layout
      style={{
        minHeight: "100dvh",
        background: "transparent",
        ["--mobile-header-offset" as string]: headerOffset,
        ["--mobile-bottom-offset" as string]: bottomOffset,
      }}
    >
      <MobilePageHeader
        mode={mode}
        title={title}
        showSearch={showSearch}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
      />
      <Layout style={{ background: "transparent" }}>
        <Content style={{ ...defaultContentStyle, ...contentStyle }}>
          {children}
        </Content>
      </Layout>
      <BottomNav
        activeTab={activeTab}
        isCompactHeight={isCompactHeight}
        onTabChange={onTabChange}
      />
    </Layout>
  );
}

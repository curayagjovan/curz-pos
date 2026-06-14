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
  activeTab: BottomNavTabKey;
  onTabChange: (tab: BottomNavTabKey) => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

const defaultContentStyle: CSSProperties = {
  paddingTop: 12,
  paddingInline: 12,
  paddingBottom: "calc(68px + env(safe-area-inset-bottom))",
  maxWidth: "100%",
  width: "100%",
  margin: "0 auto",
};

export function PageWrapper({
  mode,
  title,
  children,
  contentStyle,
  activeTab,
  onTabChange,
  showSearch = false,
  searchValue = "",
  onSearchChange,
}: PageWrapperProps) {
  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
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
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </Layout>
  );
}

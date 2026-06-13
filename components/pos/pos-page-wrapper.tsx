"use client";

import { type ReactNode } from "react";
import { Content } from "antd/es/layout/layout";
import { MobilePageHeader } from "@/components/navigation/mobile-page-header";
import { MobilePosBottomBar } from "./mobile-pos-bottom-bar";
import { usePosCart } from "@/components/providers/pos-cart-provider";

type SearchCardProps = {
  search: string;
  productsCount: number;
  onSearchChange: (value: string) => void;
};

type PosPageWrapperProps = {
  mode: "light" | "dark";
  activeTab?: "products" | "cart" | "transactions";
  onTabChange?: (tab: "products" | "cart" | "transactions") => void;
  searchCardProps?: SearchCardProps;
  children: ReactNode;
};

export function PosPageWrapper({
  mode,
  activeTab = "products",
  onTabChange,
  searchCardProps,
  children,
}: PosPageWrapperProps) {
  const sharedCart = usePosCart();

  return (
    <>
      <MobilePageHeader mode={mode} searchCardProps={searchCardProps} />
      <Content
        style={{
          paddingTop: 10,
          paddingInline: 14,
          paddingBottom: "calc(132px + env(safe-area-inset-bottom))",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {children}
      </Content>

      <MobilePosBottomBar
        mode={mode}
        cartItemCount={sharedCart.cartItemCount}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </>
  );
}

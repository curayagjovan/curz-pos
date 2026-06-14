"use client";

import Link from "next/link";
import { Button, Layout, Space, Typography } from "antd";
import { SettingsDropdown } from "@/app/components/settings/settings-dropdown";

const { Header } = Layout;

type PosHeaderProps = {
  mode: "light" | "dark";
  activePage?: "pos" | "transactions";
};

export function PosHeader({ mode, activePage = "pos" }: PosHeaderProps) {
  return (
    <Header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        height: "auto",
        padding: "8px 12px",
        borderBottom:
          mode === "dark" ? "1px solid #1f2937" : "1px solid #d8e3f2",
        background:
          mode === "dark" ? "rgba(17,24,39,0.75)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Typography.Title
        level={5}
        style={{
          margin: 0,
          color: mode === "dark" ? "#e5e7eb" : "#12325a",
          fontSize: 18,
        }}
      >
        SHOPMAE
      </Typography.Title>
      <Space size={8} wrap style={{ display: "flex", alignItems: "center" }}>
        <Link href="/pages/">
          <Button
            type={activePage === "pos" ? "primary" : "default"}
            size="middle"
          >
            PRODUCTS
          </Button>
        </Link>
        <Link href="/pages/transactions">
          <Button
            type={activePage === "transactions" ? "primary" : "default"}
            size="middle"
          >
            Transactions
          </Button>
        </Link>
        <SettingsDropdown size="middle" />
      </Space>
    </Header>
  );
}

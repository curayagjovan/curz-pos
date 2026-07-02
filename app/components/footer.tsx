"use client";

import { TabBar } from "antd-mobile";
import {
  AppOutline,
  BillOutline,
  UnorderedListOutline,
  SetOutline,
} from "antd-mobile-icons";
import { usePageContext } from "@/app/context/page-context";

type PageKey = "products" | "transactions" | "inventory" | "settings";

const tabs = [
  { key: "products" as PageKey, title: "Products", icon: <AppOutline /> },
  { key: "transactions" as PageKey, title: "Sales", icon: <BillOutline /> },
  {
    key: "inventory" as PageKey,
    title: "Inventory",
    icon: <UnorderedListOutline />,
  },
  { key: "settings" as PageKey, title: "Settings", icon: <SetOutline /> },
];

export default function Footer() {
  const { currentPage, setCurrentPage } = usePageContext();

  return (
    <TabBar
      activeKey={currentPage}
      onChange={(key) => setCurrentPage(key as PageKey)}
    >
      {tabs.map((tab) => (
        <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
      ))}
    </TabBar>
  );
}

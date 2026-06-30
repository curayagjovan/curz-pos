"use client";

import { ConfigProvider } from "antd-mobile";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

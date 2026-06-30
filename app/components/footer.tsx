"use client";

import { SearchBar } from "antd-mobile";
import { useState } from "react";

export default function Footer() {
  const [value, setValue] = useState("");

  return (
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
      <SearchBar
        value={value}
        onChange={setValue}
        placeholder="请输入内容"
        showCancelButton={() => true}
      />
    </div>
  );
}

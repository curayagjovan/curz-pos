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
        willChange: "transform",
      }}
    >
      <div style={{ padding: "0.75rem" }}>
        <SearchBar
          value={value}
          onChange={setValue}
          placeholder="Search products"
        />
      </div>
    </div>
  );
}

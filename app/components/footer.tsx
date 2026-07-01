"use client";

import { SearchBar } from "antd-mobile";
import { useState, useEffect } from "react";

export default function Footer() {
  const [value, setValue] = useState("");
  const [footerBottom, setFooterBottom] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport as
        | VisualViewport
        | undefined;

      if (visualViewport) {
        // Calculate keyboard height as difference between window.innerHeight and visualViewport.height
        const keyboardHeight = window.innerHeight - visualViewport.height;
        setFooterBottom(keyboardHeight);
      }
    };

    // Listen to viewport changes (keyboard show/hide)
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const visualViewport = window.visualViewport as VisualViewport | undefined;
    if (visualViewport) {
      visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      const vv = window.visualViewport as VisualViewport | undefined;
      if (vv) {
        vv.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: `${footerBottom}px`,
        left: 0,
        right: 0,
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        backgroundColor: "var(--background)",
        borderTop: "1px solid var(--border)",
        zIndex: 10,
        backdropFilter: "blur(8px)",
        transition: "bottom 0.3s ease-out",
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

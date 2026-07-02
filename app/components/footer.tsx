"use client";

import { SearchBar } from "antd-mobile";
import { useState, useEffect, useRef } from "react";

export default function Footer() {
  const [value, setValue] = useState("");
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const reposition = () => {
      if (!footerRef.current) return;
      // Pin footer to bottom of visual viewport
      const offsetY = window.innerHeight - vv.height - vv.offsetTop;
      footerRef.current.style.transform = `translateY(-${offsetY}px)`;
    };

    vv.addEventListener("resize", reposition);
    vv.addEventListener("scroll", reposition);

    return () => {
      vv.removeEventListener("resize", reposition);
      vv.removeEventListener("scroll", reposition);
    };
  }, []);

  return (
    <div
      ref={footerRef}
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

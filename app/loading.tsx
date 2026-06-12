"use client";

import { Progress } from "antd";

export default function GlobalLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          pointerEvents: "none",
        }}
      >
        <Progress
          percent={95}
          status="active"
          showInfo={false}
          strokeColor="var(--loading-bar-stroke)"
          railColor="var(--loading-bar-trail)"
          size={{ height: 3 }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import PageContainer from "../components/page-container";

const GLOW =
  "radial-gradient(circle at 30% 20%, rgba(14,165,233,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.16), transparent 45%)";

export default function ProductsPage() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSplashDone(true), 1700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <PageContainer title="Products">
      <div
        className="grid min-h-full w-full place-items-center transition-opacity duration-500"
        style={{
          opacity: splashDone ? 1 : 0,
          visibility: splashDone ? "visible" : "hidden",
        }}
        aria-hidden={!splashDone}
      >
        <div
          className={splashDone ? "home-greeting text-center" : "text-center"}
        >
          <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-muted">
            SHOPMAE
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Hello, User 👋
          </h1>
        </div>
      </div>

      {/* ── Splash overlay ── */}
      <div
        className="fixed inset-0 z-50 grid place-items-center overflow-hidden transition-opacity duration-500"
        style={{
          background: "var(--background)",
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "calc(var(--safe-left) + 1.5rem)",
          paddingRight: "calc(var(--safe-right) + 1.5rem)",
          opacity: splashDone ? 0 : 1,
          pointerEvents: splashDone ? "none" : "auto",
        }}
        aria-hidden={splashDone}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: GLOW }}
        />
        <div className="relative text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.34em] text-muted">
            WELCOME
          </p>
          <h1 className="splash-logo text-5xl font-black leading-none tracking-[0.18em] text-foreground sm:text-6xl">
            SHOPMAE
          </h1>
        </div>
      </div>
    </PageContainer>
  );
}

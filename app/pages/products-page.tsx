"use client";

import { useEffect, useState } from "react";
import PageContainer from "../components/page-container";

const GLOW =
  "radial-gradient(circle at 30% 20%, rgba(14,165,233,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.16), transparent 45%)";

export default function ProductsPage() {
  const [splashDone, setSplashDone] = useState(false);

  const sections = [
    {
      heading: "Yesterday",
      items: [{ title: "BED ate", meta: "Yesterday  2x4x8 - 3pcs" }],
    },
    {
      heading: "Previous 7 Days",
      items: [
        { title: "Switch", meta: "Monday  TP-Link TL-SG105 or TL-SG1005D" },
        { title: "Screen", meta: "6/11/26  124 inches x 61 inches" },
      ],
    },
    {
      heading: "Previous 30 Days",
      items: [
        {
          title: "Do you post-process your photos?",
          meta: "5/22/26  Yes, absolutely.",
        },
        { title: "GitHub PAT for HISD3", meta: "5/13/26  No additional text" },
        { title: "09953442018", meta: "5/12/26  No additional text" },
      ],
    },
    {
      heading: "May",
      items: [{ title: "4 2 kilo", meta: "5/11/26  3 1 kilo" }],
    },
  ];

  useEffect(() => {
    const t = window.setTimeout(() => setSplashDone(true), 1700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <PageContainer>
      <div
        className="transition-opacity duration-500"
        style={{
          opacity: splashDone ? 1 : 0,
          visibility: splashDone ? "visible" : "hidden",
        }}
        aria-hidden={!splashDone}
      >
        <div className="space-y-7 pb-30">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-4 font-semibold text-(--foreground)">
                {section.heading}
              </h2>
              <div className="overflow-hidden rounded-4xl border border-(--border) bg-black/5 dark:bg-white/10">
                {section.items.map((item, index) => (
                  <div key={item.title}>
                    <div className="px-5 py-3">
                      <p className="truncate text-7 font-semibold text-(--foreground)">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-3 text-(--muted)">
                        {item.meta}
                      </p>
                    </div>
                    {index < section.items.length - 1 && (
                      <div className="mx-5 h-px bg-(--border)" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Splash overlay ── */}
      <div
        className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-(--background) pt-safe pb-safe px-safe-6 transition-opacity duration-500"
        style={{
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

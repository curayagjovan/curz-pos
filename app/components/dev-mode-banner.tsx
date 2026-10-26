import { isDevDeployment } from "@/lib/env";

export default function DevModeBanner() {
  if (!isDevDeployment) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: "calc(env(safe-area-inset-top) + 18px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 2,
        background: "#e02020",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 2,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        pointerEvents: "none",
      }}
    >
      DEV
    </div>
  );
}

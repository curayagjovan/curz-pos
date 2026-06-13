import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#ffffff",
          padding: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
          You are offline
        </h1>
        <p style={{ marginTop: 10, marginBottom: 18, color: "#4b5563" }}>
          Your network connection appears to be unavailable. You can still use
          cached pages, then retry once you are back online.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/pages/"
            style={{
              background: "#1677ff",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 12px",
              textDecoration: "none",
            }}
          >
            Go to POS
          </Link>
          <Link
            href="/offline"
            style={{
              border: "1px solid #d1d5db",
              color: "#111827",
              borderRadius: 8,
              padding: "8px 12px",
              textDecoration: "none",
            }}
          >
            Retry
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function GlobalLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.22), transparent 34%), radial-gradient(circle at 82% 14%, rgba(255,255,255,0.14), transparent 30%), linear-gradient(135deg, #0a2a66 0%, #1359b8 45%, #1d7de6 100%)",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <h1
        style={{
          margin: 0,
          color: "#ffffff",
          fontSize: "clamp(2.4rem, 14vw, 4.2rem)",
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: "0 12px 28px rgba(0, 0, 0, 0.28)",
        }}
      >
        SHOPMAE
      </h1>
    </div>
  );
}

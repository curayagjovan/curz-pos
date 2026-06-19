type SplashScreenProps = {
  visible: boolean;
  appName?: string;
  label?: string;
};

export default function SplashScreen({
  visible,
  appName = "SHOPMAE",
  label = "WELCOME",
}: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-(--background) px-safe-6 pt-safe pb-safe transition-[opacity,visibility] duration-500"
      style={{
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--splash-glow)" }}
      />
      <div className="relative text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.34em] text-(--muted)">
          {label}
        </p>
        <h1 className="splash-logo text-5xl font-black leading-none tracking-[0.18em] text-(--foreground) sm:text-6xl">
          {appName}
        </h1>
      </div>
    </div>
  );
}

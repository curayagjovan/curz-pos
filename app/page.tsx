export default function HomePage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(14,165,233,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.16), transparent 45%)",
        }}
      />

      <div className="relative text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.34em] text-slate-500 dark:text-slate-400">
          WELCOME
        </p>
        <h1 className="splash-logo text-5xl font-black leading-none tracking-[0.18em] text-slate-900 dark:text-slate-100 sm:text-6xl">
          SHOPMAE
        </h1>
      </div>
    </main>
  );
}

import type { Config } from "tailwindcss";
import konstaConfig from "konsta/config";

export default konstaConfig({
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
}) satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/konsta/shared/**/*.{js,mjs}",
    "./node_modules/konsta/react/**/*.{js,mjs}",
    "./node_modules/konsta/styles/**/*.css",
  ],
  darkMode: "class",
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
} satisfies Config;

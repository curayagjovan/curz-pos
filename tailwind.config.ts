import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS Color Palette
        "ios-bg-light": "#F2F2F7",
        "ios-bg-dark": "#1C1C1E",
        "ios-text-light": "#FFFFFF",
        "ios-text-dark": "#000000",
        "ios-divider": "#E5E5E5",
      },
    },
  },
  plugins: [],
} satisfies Config;

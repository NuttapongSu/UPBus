import type { Config } from "tailwindcss";
import { COLORS } from "./lib/theme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          green: COLORS.green,
          blue: COLORS.blue,
          red: COLORS.red,
          orange: COLORS.orange,
          purple: COLORS.purple,
          "purple-dark": COLORS.purpleDark,
        },
      },
    },
  },
  plugins: [],
};
export default config;

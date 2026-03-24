import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bicr: {
          teal: "#006373",
          "light-blue": "#C3E3F2",
          "light-teal": "#b5e2e4",
          orange: "#F8B457",
          navy: "#023d5b",
          "light-green": "#a0dab3",
          "warm-orange": "#faa475",
          "burnt-orange": "#db704f",
          "dusty-pink": "#dba5a1",
          charcoal: "#434C53",
        },
      },
    },
  },
  plugins: [],
};
export default config;

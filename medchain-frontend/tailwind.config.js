/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4B66",
          hover: "#163D53",
          active: "#122F41",
          tint: "#EAF0F3",
        },
        secondary: {
          DEFAULT: "#2F6F63",
          hover: "#265A50",
          tint: "#E9F2F0",
        },
        accent: {
          DEFAULT: "#A66423",
          hover: "#8A521C",
          tint: "#F6ECE1",
        },
        surface: "#FFFFFF",
        canvas: "#F6F7F8",
        ink: {
          DEFAULT: "#14181D",
          muted: "#5B6470",
          faint: "#9AA1AA",
        },
        border: {
          DEFAULT: "#DCE1E6",
          strong: "#C3CAD1",
        },
        success: { DEFAULT: "#1E8E5A", tint: "#E4F5EC", text: "#146B3F" },
        warning: { DEFAULT: "#D97706", tint: "#FCEEDD", text: "#8A5210" },
        danger: { DEFAULT: "#C23B3B", tint: "#FBEAEA", text: "#8F2A2A" },
        neutralBadge: { tint: "#EEF1F3", text: "#5B6470" },
        teal: { tint: "#E3EFEC", text: "#1F4E45" },
      },
      fontFamily: {
        sans: ["Public Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      fontSize: {
        h1: ["30px", { lineHeight: "38px", fontWeight: "700" }],
        h2: ["22px", { lineHeight: "30px", fontWeight: "700" }],
        h3: ["17px", { lineHeight: "26px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "24px", fontWeight: "400" }],
        small: ["13px", { lineHeight: "20px", fontWeight: "400" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "600" }],
      },
      borderRadius: {
        xs: "4px",
        md: "8px",
      },
      boxShadow: {
        overlay: "0 8px 24px rgba(20,24,29,0.12)",
      },
      spacing: {
        4.5: "18px",
      },
    },
  },
  plugins: [],
};

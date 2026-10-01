/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: "#EEF2FF",
          100: "#E8EEFD",
          300: "#93A8F0",
          500: "#3B82F6",
          600: "#2563EB",
          hover: "#1D4ED8",
          pressed: "#1E40AF",
          disabled: "#93B4F5",
        },
        accent: {
          orange: "#FF8A00",
        },
        surface: {
          page: "#FAFAFA",
          surface: "#FFFFFF",
          rowAlt: "#F5F8FE",
          chipBg: "#D6DAE3",
        },
        chart: {
          mechanical: "#D0382E",
          synchron: "#FFB400",
          performing: "#4B3BE8",
          dsp: "#3F9468",
          empty: "#757575",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
}

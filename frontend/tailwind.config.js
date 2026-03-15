/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EBF5FF",
          100: "#C3DFFE",
          500: "#0066CC",
          600: "#0052A3",
          700: "#003D7A",
        },
        secondary: {
          500: "#00A86B",
          600: "#00875A",
        },
      },
    },
  },
  plugins: [],
};

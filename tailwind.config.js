/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        ink: "#05070F",
        panel: "#0B0E1D",
        raise: "#12172E",
        accent: "#38BDF8",
        accent2: "#22C55E",
        mist: "#A8AECB",
        faint: "#767CA0",
      },
    },
  },
  plugins: [],
};

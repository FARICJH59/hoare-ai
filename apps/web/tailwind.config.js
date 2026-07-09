/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "hoare-blue": "#0066cc",
        "hoare-dark": "#0a0f1e",
        "hoare-surface": "#111827",
      },
    },
  },
  plugins: [],
};

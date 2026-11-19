/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandBlue: '#4c85df',
        brandPurple: '#8d75db',
        brandGreen: '#57b985',
        brandYellow: '#f6cb59',
        brandSky: '#e8f4ff',
        brandInk: '#263d5a',
        brandSurface: '#f4f8fd',
      },
      borderRadius: {
        card: '20px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 10px 28px #31507811',
        tactile: '0 5px 0 #3662ad',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000', // black
          foreground: '#ffffff', // white
        },
        secondary: {
          DEFAULT: '#FFD700', // gold
          foreground: '#000000', // black
        },
      },
      fontFamily: {
        sans: ['Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
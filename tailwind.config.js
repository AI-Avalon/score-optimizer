/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          base: '#0D0F12',
          panel: '#161922',
          border: '#272B35'
        }
      }
    },
  },
  plugins: [],
}

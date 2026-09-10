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
          base: '#0B0D13',
          panel: '#161922',
          border: '#272B35'
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gov-blue': '#1e3a8a',
        'gov-orange': '#ea580c',
        'gov-green': '#16a34a',
        'gov-gold': '#d97706',
      }
    },
  },
  plugins: [],
}

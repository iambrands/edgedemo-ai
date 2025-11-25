/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#1e293b',
        success: '#10b981',
        warning: '#f97316',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}


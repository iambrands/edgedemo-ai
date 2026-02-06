/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC',
          dark: '#004499',
          light: '#E6F0FA',
        },
        secondary: {
          green: '#00A86B',
          red: '#DC3545',
          amber: '#F59E0B',
        },
        bg: {
          dark: '#1A1D29',
          light: '#F8FAFC',
          card: '#FFFFFF',
        },
        border: '#E2E8F0',
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

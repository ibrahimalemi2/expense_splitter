/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}

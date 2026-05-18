/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Ubuntu', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.12)',
        card: '0 1px 0 rgba(15, 23, 42, 0.06), 0 12px 40px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}

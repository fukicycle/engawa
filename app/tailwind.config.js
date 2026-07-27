/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#faf8f5',   // Very light warm washi paper
          100: '#f5efe6',  // Soft cream wood
          200: '#e8dfd8',  // Light tatami/beech wood
          300: '#dfd3c3',  // Warm beige wood
          400: '#c4b5a6',  // Muted oak wood
          900: '#4a3c31',  // Deep dark wood text
        },
        engawa: {
          50: '#f4f7f2',   // Extremely soft green tint
          100: '#e8efe5',  // Very light tea green
          500: '#526e47',  // Muted moss green (primary)
          600: '#3e532b',  // Mid-tone dark green
          700: '#2c3e1c',  // Deep forest green
          800: '#1d2a13',  // Dark muted green (primary dark)
          900: '#101a0a',  // Near black green
        }
      },
      fontFamily: {
        soft: ['"Zen Maru Gothic"', '"Klee One"', '"Hiragino Maru Gothic ProN"', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        md: '8px',
        lg: '12px',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Uber Base Design System Palette
        uber: {
          black: '#000000',
          white: '#ffffff',
          gray50: '#f6f6f6',
          gray100: '#eeeeee',
          gray200: '#e2e2e2',
          gray300: '#cbcbcb',
          gray400: '#a6a6a6',
          gray500: '#757575',
          gray600: '#545454',
          gray700: '#333333',
          gray800: '#1f1f1f',
          gray900: '#141414',
          blue: '#276EF1',
          blueHover: '#1E54B7',
          blueLight: '#EDF3FE',
          red: '#E11900',
          redLight: '#FDF0EE',
          yellow: '#FFC043',
          yellowLight: '#FFFBF0',
          green: '#048848',
          greenLight: '#EEF8F3',
        },
        gov: {
          50: '#f6f8fb',
          100: '#ebf0f7',
          200: '#d5e2f0',
          300: '#b0cbe4',
          400: '#83aed5',
          500: '#6092c4',
          600: '#4876ad',
          700: '#395e8e',
          800: '#325075',
          900: '#000000',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'base': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 6px 16px rgba(0, 0, 0, 0.12)',
        'modal': '0 20px 48px rgba(0, 0, 0, 0.28)',
      }
    },
  },
  plugins: [],
}

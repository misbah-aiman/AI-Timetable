module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light blue theme – sky palette for good contrast and readability
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // App surface colors for cards and panels
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f0f9ff',
          elevated: '#e0f2fe',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(2, 132, 199, 0.08), 0 10px 20px -2px rgba(2, 132, 199, 0.04)',
        'glow': '0 0 20px -5px rgba(2, 132, 199, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
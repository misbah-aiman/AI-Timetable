module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // White + emerald theme
        primary: {
          50: '#ffffff',
          100: '#ecfdf5',
          200: '#d1fae5',
          300: '#a7f3d0',
          400: '#6ee7b7',
          500: '#34d399',
          600: '#10b981',
          700: '#059669',
          800: '#047857',
          900: '#065f46',
        },
        // App surface colors for cards and panels
        surface: {
          DEFAULT: '#ffffff',
          muted: '#ffffff',
          elevated: '#ffffff',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(5, 150, 105, 0.08), 0 10px 20px -2px rgba(5, 150, 105, 0.04)',
        'glow': '0 0 20px -5px rgba(5, 150, 105, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
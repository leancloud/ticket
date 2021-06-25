module.exports = {
  purge: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        tapBlue: {
          50: '#FAFEFE',
          100: '#EFFBFC',
          200: '#E8F9FA',
          300: '#C7F1F3',
          400: '#A4E8EC',
          500: '#44D1D8',
          600: '#15C5CE',
          700: '#12ADB5',
        },
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active'],
      borderColor: ['active'],
    },
  },
  plugins: [],
};

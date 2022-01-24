module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tapBlue: {
          DEFAULT: '#15C5CE',
          50: '#CEF8FA',
          100: '#B7F5F8',
          200: '#89EEF3',
          300: '#5BE7EE',
          400: '#2CE0EA',
          500: '#15C5CE',
          600: '#13AFB7',
          700: '#1099A0',
          800: '#0E8389',
          900: '#0C6C71',
        },
        red: {
          DEFAULT: '#F64C4C',
        },
      },
      fontSize: {
        xs: ['12px', '15px'],
        sm: ['12px', '18px'],
        base: ['14px', '21px'],
      },
    },
  },
};

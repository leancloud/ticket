module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tapBlue: {
          DEFAULT: '#00d9c5',
          100: '#fafefe',
          200: '#edfcfb',
          300: '#e6fbf9',
          400: '#c2f6f1',
          500: '#9cf0e8',
          600: '#33e1d1',
          700: '#00d9c5',
          800: '#00bfad',
        },
        red: {
          DEFAULT: '#F64C4C',
        },
        green: {
          DEFAULT: '#47b881',
        },
        amber: {
          DEFAULT: '#ff7f4f',
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

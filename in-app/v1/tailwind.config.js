module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tapBlue: {
          DEFAULT: '#00d9c5',
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

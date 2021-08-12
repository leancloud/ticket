module.exports = {
  purge: ['./src/**/*.tsx'],
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2C97E8',
          50: '#FBFDFF',
          100: '#E4F2FC',
          200: '#B6DBF7',
          300: '#88C4F2',
          400: '#5AAEED',
          500: '#2C97E8',
          600: '#167DCB',
          700: '#11619D',
          800: '#0C446F',
          900: '#072841',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};

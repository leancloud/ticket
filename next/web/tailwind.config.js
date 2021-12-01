module.exports = {
  purge: ['./src/**/*.tsx'],
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#15c5ce',
          50: '#fafefe',
          100: '#fafefe',
          200: '#fafefe',
          300: '#effbfc',
          400: '#e8f9fa',
          500: '#c7f1f3',
          600: '#a4e8ec',
          700: '#44d1d8',
          800: '#15c5ce',
          900: '#12adb5',
        },
      },
      fontSize: {
        sm: ['12px', '18px'],
        base: ['14px', '20px'],
        lg: ['16px', '24px'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
};

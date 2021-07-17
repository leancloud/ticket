module.exports = {
  purge: ['./src/**/*.tsx'],
  variants: {
    extend: {
      backgroundColor: ['active'],
      borderColor: ['active', 'last'],
      padding: ['last'],
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

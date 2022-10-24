module.exports = {
  extends: [
    '../.eslintrc.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
  ],

  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
  },

  rules: {
    'react/display-name': 'off',
    'react/no-children-prop': 'off',
    'react/no-unknown-property': 'warn',
    'react/jsx-key': 'warn',
    'react/jsx-no-target-blank': ['warn', { enforceDynamicLinks: 'never' }],
    'react/prop-types': 'off',
  },
};

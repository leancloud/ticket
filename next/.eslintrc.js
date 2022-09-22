module.exports = {
  root: true,

  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    mocha: true,
  },

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:promise/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },

  plugins: ['promise', 'i18n', '@typescript-eslint'],

  rules: {
    'linebreak-style': ['error', 'unix'],
    'no-console': 0,
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'promise/no-nesting': 0,
    'promise/no-callback-in-promise': 0,
    'i18n/no-chinese-character': 1,
  },
};

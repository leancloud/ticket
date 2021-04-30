module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    mocha: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:promise/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['react', 'promise', 'i18n'],
  rules: {
    'linebreak-style': ['error', 'unix'],
    'no-console': 0,
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'promise/no-nesting': 0,
    'promise/no-callback-in-promise': 0,
    'i18n/no-chinese-character': 1,
  },
}

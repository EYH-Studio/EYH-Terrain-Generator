module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:prettier/recommended',
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'no-console': 'warn',
        'no-unused-vars': 'warn',
        'prefer-const': 'error',
        'eqeqeq': 'error',
        'curly': 'error',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
    },
};
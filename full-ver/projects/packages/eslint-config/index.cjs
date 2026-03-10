/**
 * @what ベース ESLint 設定
 * @why TypeScript プロジェクト共通の設定を一元化
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '.next/', 'generated/', 'next-env.d.ts'],
};

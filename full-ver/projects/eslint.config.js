/**
 * @what ESLint 設定（モノレポ共通）- ESLint 9 flat config
 * @why レイヤー間の依存方向を静的に検査し、アーキテクチャの崩壊を防ぐ
 *
 * アーキテクチャ:
 * - apps/api: Clean Architecture
 * - apps/web: Feature-Sliced Design (FSD)
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },
  // Clean Architecture 用（apps/api 向け）
  {
    files: ['apps/api/**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/include': ['apps/api/src/**/*', 'packages/*/src/**/*'],
      'boundaries/elements': [
        { type: 'domain', pattern: 'apps/api/src/domain/**/*' },
        { type: 'usecase', pattern: 'apps/api/src/usecase/**/*' },
        { type: 'presentation', pattern: 'apps/api/src/presentation/**/*' },
        { type: 'infrastructure', pattern: 'apps/api/src/infrastructure/**/*' },
        { type: 'composition', pattern: 'apps/api/src/composition/**/*' },
        { type: 'shared', pattern: 'packages/shared/src/**/*' },
        { type: 'api-contract', pattern: 'packages/api-contract/src/**/*' },
      ],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['domain'], allow: ['domain', 'shared'] },
            { from: ['usecase'], allow: ['usecase', 'domain', 'shared'] },
            { from: ['presentation'], allow: ['presentation', 'usecase', 'shared'] },
            { from: ['infrastructure'], allow: ['infrastructure', 'domain', 'shared'] },
            {
              from: ['composition'],
              allow: [
                'composition',
                'domain',
                'usecase',
                'presentation',
                'infrastructure',
                'shared',
              ],
            },
            { from: ['shared'], allow: ['shared'] },
            { from: ['api-contract'], allow: ['api-contract', 'shared'] },
          ],
        },
      ],
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['pg', 'mysql*', 'mongodb', 'redis', 'axios', 'node-fetch'],
              message:
                'Infrastructure dependencies should not be imported in domain/usecase layers',
            },
          ],
        },
      ],
    },
  },
  // Global rules
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // テストファイル・スクリプトでは console を許可（global rules より後ろに配置して上書き）
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*', '**/scripts/**/*', '**/scripts/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Web app: gray-* → neutral-* enforcement (className属性内のみ)
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/gray-/]',
          message:
            '⚠️ gray-* は非推奨です。neutral-* を使用してください。参照: docs/01_product/design_system/dark-mode-guidelines.md',
        },
        {
          selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/gray-/]',
          message:
            '⚠️ gray-* は非推奨です。neutral-* を使用してください。参照: docs/01_product/design_system/dark-mode-guidelines.md',
        },
      ],
    },
  },
  // Ignore patterns
  {
    ignores: [
      'dist/',
      '**/dist/',
      'node_modules/',
      '.next/',
      '**/generated/**',
      '**/*.cjs',
      'apps/web/.next/**',
      '**/pnpm-lock.yaml',
      '**/next-env.d.ts',
    ],
  },
];

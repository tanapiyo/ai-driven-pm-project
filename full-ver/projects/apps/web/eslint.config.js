/**
 * @what Next.js (FSD) アプリ用 ESLint 設定 - ESLint 9 flat config
 * @why FSD レイヤー境界 + Next.js 固有ルールを適用
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  // FSD boundaries configuration
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'fsd-app', pattern: 'src/app/**/*', mode: 'folder' },
        { type: 'fsd-widgets', pattern: 'src/widgets/*', mode: 'folder', capture: ['slice'] },
        { type: 'fsd-features', pattern: 'src/features/*', mode: 'folder', capture: ['slice'] },
        { type: 'fsd-entities', pattern: 'src/entities/*', mode: 'folder', capture: ['slice'] },
        { type: 'fsd-shared-api', pattern: 'src/shared/api/**/*', mode: 'folder' },
        { type: 'fsd-shared-ui', pattern: 'src/shared/ui/**/*', mode: 'folder' },
        { type: 'fsd-shared-lib', pattern: 'src/shared/lib/**/*', mode: 'folder' },
        { type: 'fsd-shared-config', pattern: 'src/shared/config/**/*', mode: 'folder' },
        { type: 'fsd-shared-types', pattern: 'src/shared/types/**/*', mode: 'folder' },
        { type: 'fsd-shared', pattern: 'src/shared/**/*', mode: 'folder' },
      ],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: ['fsd-app'],
              allow: [
                'fsd-app',
                'fsd-widgets',
                'fsd-features',
                'fsd-entities',
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
            },
            {
              from: ['fsd-widgets'],
              allow: [
                'fsd-widgets',
                'fsd-features',
                'fsd-entities',
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
            },
            {
              from: ['fsd-features'],
              allow: [
                'fsd-features',
                'fsd-entities',
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
            },
            {
              from: ['fsd-entities'],
              allow: [
                'fsd-entities',
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
            },
            {
              from: [
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
              allow: [
                'fsd-shared',
                'fsd-shared-api',
                'fsd-shared-ui',
                'fsd-shared-lib',
                'fsd-shared-config',
                'fsd-shared-types',
              ],
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**', '@/app/**'],
              message: 'app レイヤーへの import は禁止されています。',
            },
            {
              group: [
                '@/features/*/model/**',
                '@/features/*/ui/**',
                '@/features/*/lib/**',
                '@/features/*/api/**',
              ],
              message: 'features スライスは index.ts 経由でのみ import できます。',
            },
            {
              group: [
                '@/entities/*/model/**',
                '@/entities/*/ui/**',
                '@/entities/*/lib/**',
                '@/entities/*/api/**',
              ],
              message: 'entities スライスは index.ts 経由でのみ import できます。',
            },
            {
              group: [
                '@/widgets/*/model/**',
                '@/widgets/*/ui/**',
                '@/widgets/*/lib/**',
                '@/widgets/*/api/**',
              ],
              message: 'widgets スライスは index.ts 経由でのみ import できます。',
            },
            {
              group: ['axios', 'ky', 'got', 'node-fetch', 'undici'],
              message:
                'HTTP クライアントの直接使用は禁止です。@/shared/api 経由で API を呼び出してください。',
            },
          ],
        },
      ],
    },
  },
  // テストファイルでは console を許可
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/tests/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  // Ignore patterns
  {
    ignores: [
      '.next/',
      'out/',
      'src/shared/api/generated/**/*',
      'next-env.d.ts',
      'node_modules/',
      '**/*.cjs',
    ],
  },
];

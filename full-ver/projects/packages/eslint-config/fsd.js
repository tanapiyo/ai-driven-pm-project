/**
 * @what Feature-Sliced Design (FSD) 用 ESLint 設定 (flat config)
 * @why FSD レイヤー間の依存方向を静的に検査し、アーキテクチャの崩壊を防ぐ
 *
 * FSD レイヤー構造（上から下へ依存可能）:
 *   app → widgets → features → entities → shared
 */
import boundaries from 'eslint-plugin-boundaries';

export default [
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
];

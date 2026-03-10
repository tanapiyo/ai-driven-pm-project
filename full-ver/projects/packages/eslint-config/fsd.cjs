/**
 * @what Feature-Sliced Design (FSD) 用 ESLint 設定
 * @why FSD レイヤー間の依存方向を静的に検査し、アーキテクチャの崩壊を防ぐ
 *
 * FSD レイヤー構造（上から下へ依存可能）:
 *   app → widgets → features → entities → shared
 *
 * ルール:
 * 1. 上位レイヤーは下位レイヤーのみに依存可能
 * 2. 同レイヤー間・下から上への依存は禁止
 * 3. スライス（features/auth など）は index.ts 経由でのみ公開
 * 4. shared は外部に依存しない
 */
module.exports = {
  plugins: ['boundaries'],
  extends: ['plugin:boundaries/recommended'],
  settings: {
    'boundaries/include': ['src/**/*'],
    'boundaries/elements': [
      // app レイヤー（Next.js App Router）
      {
        type: 'fsd-app',
        pattern: 'src/app/**/*',
        mode: 'folder',
      },
      // widgets レイヤー（スライス）
      {
        type: 'fsd-widgets',
        pattern: 'src/widgets/*',
        mode: 'folder',
        capture: ['slice'],
      },
      // features レイヤー（スライス）
      {
        type: 'fsd-features',
        pattern: 'src/features/*',
        mode: 'folder',
        capture: ['slice'],
      },
      // entities レイヤー（スライス）
      {
        type: 'fsd-entities',
        pattern: 'src/entities/*',
        mode: 'folder',
        capture: ['slice'],
      },
      // shared レイヤー（セグメント）
      {
        type: 'fsd-shared-api',
        pattern: 'src/shared/api/**/*',
        mode: 'folder',
      },
      {
        type: 'fsd-shared-ui',
        pattern: 'src/shared/ui/**/*',
        mode: 'folder',
      },
      {
        type: 'fsd-shared-lib',
        pattern: 'src/shared/lib/**/*',
        mode: 'folder',
      },
      {
        type: 'fsd-shared-config',
        pattern: 'src/shared/config/**/*',
        mode: 'folder',
      },
      {
        type: 'fsd-shared-types',
        pattern: 'src/shared/types/**/*',
        mode: 'folder',
      },
      {
        type: 'fsd-shared',
        pattern: 'src/shared/**/*',
        mode: 'folder',
      },
    ],
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    /**
     * FSD レイヤー間の依存制約
     */
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // app: 全ての下位レイヤーに依存可能
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
          // widgets: features, entities, shared のみ
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
          // features: entities, shared のみ
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
          // entities: shared のみ
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
          // shared: 自身のセグメントのみ（外部レイヤー禁止）
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

    /**
     * app レイヤーへの import を全面禁止
     * app は組み立て層なので外部から参照させない
     */
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/app/**', '@/app/**'],
            message: 'app レイヤーへの import は禁止されています。app は組み立て層です。',
          },
          // スライスの深い import を禁止（index.ts 経由のみ許可）
          {
            group: [
              '@/features/*/model/**',
              '@/features/*/ui/**',
              '@/features/*/lib/**',
              '@/features/*/api/**',
              '@/features/*/*/**',
            ],
            message: 'features スライスは index.ts 経由でのみ import できます。例: @/features/auth',
          },
          {
            group: [
              '@/entities/*/model/**',
              '@/entities/*/ui/**',
              '@/entities/*/lib/**',
              '@/entities/*/api/**',
              '@/entities/*/*/**',
            ],
            message: 'entities スライスは index.ts 経由でのみ import できます。例: @/entities/user',
          },
          {
            group: [
              '@/widgets/*/model/**',
              '@/widgets/*/ui/**',
              '@/widgets/*/lib/**',
              '@/widgets/*/api/**',
              '@/widgets/*/*/**',
            ],
            message: 'widgets スライスは index.ts 経由でのみ import できます。例: @/widgets/header',
          },
          // 相対パスでのスライス越境禁止
          {
            group: [
              '../../features/**',
              '../../entities/**',
              '../../widgets/**',
              '../../shared/**',
            ],
            message:
              'レイヤーをまたぐ相対パス import は禁止です。@/* エイリアスを使用してください。',
          },
          {
            group: ['../../../**'],
            message: '深い相対パス import は禁止です。@/* エイリアスを使用してください。',
          },
          // HTTP 直叩き禁止
          {
            group: ['axios', 'ky', 'got', 'node-fetch', 'undici'],
            message:
              'HTTP クライアントの直接使用は禁止です。@/shared/api 経由で API を呼び出してください。',
          },
          // Node.js 専用モジュールをクライアント領域で禁止
          {
            group: ['fs', 'path', 'os', 'child_process', 'cluster', 'worker_threads'],
            message: 'Node.js 専用モジュールはクライアントコードで使用できません。',
          },
        ],
      },
    ],
  },
  overrides: [
    // スライス内部では同スライス内の深い import を許可
    {
      files: ['src/features/*/ui/**/*', 'src/features/*/model/**/*', 'src/features/*/lib/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              // 他のスライスへの深い import は引き続き禁止
              {
                group: ['../**/features/*/model/**', '../**/features/*/ui/**'],
                message: '他のスライスへの深い import は禁止です。',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/entities/*/ui/**/*', 'src/entities/*/model/**/*', 'src/entities/*/lib/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../**/entities/*/model/**', '../**/entities/*/ui/**'],
                message: '他のスライスへの深い import は禁止です。',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/widgets/*/ui/**/*', 'src/widgets/*/model/**/*', 'src/widgets/*/lib/**/*'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../**/widgets/*/model/**', '../**/widgets/*/ui/**'],
                message: '他のスライスへの深い import は禁止です。',
              },
            ],
          },
        ],
      },
    },
    // shared/config のみ process.env を許可
    {
      files: ['src/shared/config/**/*'],
      rules: {
        // config 内では process.env 参照を許可
      },
    },
    // それ以外では process.env 直接参照を禁止
    {
      files: ['src/**/*'],
      excludedFiles: ['src/shared/config/**/*'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'MemberExpression[object.object.name="process"][object.property.name="env"]',
            message: 'process.env の直接参照は禁止です。@/shared/config 経由で取得してください。',
          },
        ],
      },
    },
  ],
};

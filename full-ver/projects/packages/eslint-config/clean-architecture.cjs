/**
 * @what Clean Architecture 用 ESLint 設定
 * @why レイヤー間の依存方向を静的に検査し、アーキテクチャの崩壊を防ぐ
 *
 * Clean Architecture の依存方向:
 *   presentation → usecase → domain ← infrastructure
 *   composition は全レイヤーをimport可能
 */
module.exports = {
  plugins: ['boundaries'],
  extends: ['plugin:boundaries/recommended'],
  settings: {
    'boundaries/include': ['src/**/*'],
    'boundaries/elements': [
      // Domain層: ビジネスロジック（他レイヤーに依存しない）
      { type: 'domain', pattern: 'src/domain/**/*' },
      // UseCase層: アプリケーションロジック（domainのみ依存可）
      { type: 'usecase', pattern: 'src/usecase/**/*' },
      // Presentation層: HTTP/UI（usecaseのみ依存可）
      { type: 'presentation', pattern: 'src/presentation/**/*' },
      // Infrastructure層: 外部サービス・DB（domainのみ依存可）
      { type: 'infrastructure', pattern: 'src/infrastructure/**/*' },
      // Composition層: DI構成（全レイヤー依存可）
      { type: 'composition', pattern: 'src/composition/**/*' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // domain: 外部レイヤーに依存しない
          {
            from: ['domain'],
            allow: ['domain'],
          },
          // usecase: domain のみ
          {
            from: ['usecase'],
            allow: ['usecase', 'domain'],
          },
          // presentation: usecase のみ（domainを直接importしない）
          {
            from: ['presentation'],
            allow: ['presentation', 'usecase'],
          },
          // infrastructure: domain のみ（usecaseを直接importしない）
          {
            from: ['infrastructure'],
            allow: ['infrastructure', 'domain'],
          },
          // composition: 全レイヤーをimport可能
          {
            from: ['composition'],
            allow: ['composition', 'domain', 'usecase', 'presentation', 'infrastructure'],
          },
        ],
      },
    ],
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          // domain層でインフラ固有のモジュールを禁止
          {
            group: ['pg', 'mysql*', 'mongodb', 'redis', 'axios', 'node-fetch'],
            message: 'Infrastructure dependencies should not be imported in domain/usecase layers',
          },
        ],
      },
    ],
  },
};

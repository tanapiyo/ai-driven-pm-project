# @monorepo/eslint-config

モノレポ共通の ESLint 設定パッケージ。

## 提供する設定

| Export                                       | 用途                     |
| -------------------------------------------- | ------------------------ |
| `@monorepo/eslint-config`                    | ベース設定（TypeScript） |
| `@monorepo/eslint-config/fsd`                | Feature-Sliced Design 用 |
| `@monorepo/eslint-config/clean-architecture` | Clean Architecture 用    |

## 使い方

### FSD (Next.js) アプリ

```javascript
// apps/web/.eslintrc.cjs
const baseConfig = require('@monorepo/eslint-config');
const fsdConfig = require('@monorepo/eslint-config/fsd');

module.exports = {
  root: true,
  ...baseConfig,
  extends: [...baseConfig.extends, ...fsdConfig.extends, 'next/core-web-vitals'],
  plugins: [...baseConfig.plugins, ...fsdConfig.plugins],
  settings: {
    ...fsdConfig.settings,
  },
  rules: {
    ...baseConfig.rules,
    ...fsdConfig.rules,
  },
};
```

### Clean Architecture アプリ

```javascript
// apps/api/.eslintrc.cjs
const baseConfig = require('@monorepo/eslint-config');
const caConfig = require('@monorepo/eslint-config/clean-architecture');

module.exports = {
  root: true,
  ...baseConfig,
  extends: [...baseConfig.extends, ...caConfig.extends],
  plugins: [...baseConfig.plugins, ...caConfig.plugins],
  settings: {
    ...caConfig.settings,
  },
  rules: {
    ...baseConfig.rules,
    ...caConfig.rules,
  },
};
```

## FSD レイヤールール

| レイヤー | 依存可能                            |
| -------- | ----------------------------------- |
| app      | widgets, features, entities, shared |
| widgets  | features, entities, shared          |
| features | entities, shared                    |
| entities | shared                              |
| shared   | (なし)                              |

## 検出する違反

1. **レイヤー境界違反**: 下位→上位への依存
2. **深い import**: スライス内部への直接アクセス
3. **HTTP 直叩き**: axios/ky/fetch の直接使用
4. **process.env 直参照**: shared/config 以外での使用
5. **相対パス越境**: `../../` でのレイヤー越境

# Design Tokens

このディレクトリにはデザイントークン（デザインシステムの基盤となる値）を格納します。

## Files

- `tokens.json` - トークン定義

## Usage

### CSS Custom Properties として使用

```css
:root {
  --color-primary-500: #3b82f6;
  --space-4: 1rem;
}
```

### JavaScript/TypeScript で使用

```typescript
import tokens from './tokens.json';

const primaryColor = tokens.color.primary['500'];
```

## Documentation

- [docs/01_product/design_system/overview.md](../../docs/01_product/design_system/overview.md) - 概要
- [docs/01_product/design_system/tokens.schema.md](../../docs/01_product/design_system/tokens.schema.md) - スキーマ定義

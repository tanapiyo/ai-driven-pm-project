# Tokens Schema

## Overview

`design/tokens/tokens.json` の構造を定義します。

---

## Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "color": {
      "type": "object",
      "description": "Color tokens",
      "properties": {
        "primary": { "$ref": "#/$defs/colorScale" },
        "neutral": { "$ref": "#/$defs/colorScale" },
        "brand": { "type": "object" },
        "semantic": { "$ref": "#/$defs/semanticColors" }
      }
    },
    "font": {
      "type": "object",
      "properties": {
        "family": { "type": "object" },
        "size": { "$ref": "#/$defs/scale" },
        "weight": { "type": "object" },
        "lineHeight": { "$ref": "#/$defs/scale" }
      }
    },
    "space": { "$ref": "#/$defs/scale" },
    "border": {
      "type": "object",
      "properties": {
        "radius": { "$ref": "#/$defs/scale" },
        "width": { "$ref": "#/$defs/scale" }
      }
    },
    "shadow": { "$ref": "#/$defs/scale" },
    "duration": { "$ref": "#/$defs/scale" }
  },
  "$defs": {
    "colorScale": {
      "type": "object",
      "properties": {
        "50": { "type": "string" },
        "100": { "type": "string" },
        "200": { "type": "string" },
        "300": { "type": "string" },
        "400": { "type": "string" },
        "500": { "type": "string" },
        "600": { "type": "string" },
        "700": { "type": "string" },
        "800": { "type": "string" },
        "900": { "type": "string" }
      }
    },
    "semanticColors": {
      "type": "object",
      "description": "Semantic color tokens for dark mode support",
      "properties": {
        "background": { "$ref": "#/$defs/lightDarkPair" },
        "surface": { "$ref": "#/$defs/lightDarkPair" },
        "text": {
          "type": "object",
          "properties": {
            "primary": { "$ref": "#/$defs/lightDarkPair" },
            "secondary": { "$ref": "#/$defs/lightDarkPair" }
          }
        },
        "border": { "$ref": "#/$defs/lightDarkPair" }
      }
    },
    "lightDarkPair": {
      "type": "object",
      "properties": {
        "light": { "type": "string" },
        "dark": { "type": "string" }
      },
      "required": ["light", "dark"]
    },
    "scale": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      }
    }
  }
}
```

---

## Color Scale

カラースケールは 50-900 の10段階で定義：

| Scale | Usage |
|-------|-------|
| 50 | Lightest background |
| 100-300 | Light variants |
| 400-500 | Default / Base |
| 600-700 | Dark variants |
| 800-900 | Darkest / Text on light bg |

---

## Naming Guidelines

1. **Semantic names preferred**: `primary`, `success` > `blue`, `green`
2. **Consistent scales**: 同じカテゴリは同じスケール名を使用
3. **No magic numbers**: 意味のある名前を使う

---

## Updating Tokens

1. `design/tokens/tokens.json` を編集
2. PR を作成し、デザインチームのレビューを受ける
3. マージ後、必要に応じてビルドスクリプトを実行

---

## Dark Mode (Semantic Tokens)

ダークモード対応のため、セマンティックカラートークンを使用します。

### Structure

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | #ffffff | #171717 | ページ背景 |
| `surface` | #fafafa | #262626 | カード・パネル背景 |
| `text.primary` | #171717 | #fafafa | 主要テキスト |
| `text.secondary` | #525252 | #a3a3a3 | 補助テキスト |
| `border` | #e5e5e5 | #404040 | ボーダー |

### Tailwind Usage

```tsx
// 背景
<div className="bg-background-light dark:bg-background-dark">

// テキスト
<p className="text-foreground-light dark:text-foreground-dark">

// サーフェス
<div className="bg-surface-light dark:bg-surface-dark">
```

### WCAG Accessibility

すべてのカラーペアは WCAG 2.1 Level AA を満たしています:

| Pair | Contrast Ratio | Status |
|------|----------------|--------|
| text.primary.dark on background.dark | 16.1:1 | ✅ AA |
| text.secondary.dark on background.dark | 4.8:1 | ✅ AA |
| text.primary.dark on surface.dark | 15.0:1 | ✅ AA |

**要件**:
- 通常テキスト: 4.5:1 以上
- 大きいテキスト (18px+): 3:1 以上

### Token Architecture

セマンティックトークンは既存のスケールトークンを参照:

```
background.dark = neutral.900 (#171717)
surface.dark    = neutral.800 (#262626)
text.primary.dark    = neutral.50  (#fafafa)
text.secondary.dark  = neutral.400 (#a3a3a3)
border.dark     = neutral.700 (#404040)
```

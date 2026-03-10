/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('../../../design/tokens/tokens.json');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: tokens.color.primary,
        neutral: tokens.color.neutral,
        // Semantic colors for dark mode support
        background: tokens.color.semantic.background,
        surface: tokens.color.semantic.surface,
        foreground: tokens.color.semantic.text.primary,
        'foreground-secondary': tokens.color.semantic.text.secondary,
        'border-color': tokens.color.semantic.border,
      },
      fontFamily: {
        sans: tokens.font.family.sans.split(', '),
        mono: tokens.font.family.mono.split(', '),
      },
      fontSize: tokens.font.size,
      fontWeight: tokens.font.weight,
      lineHeight: tokens.font.lineHeight,
      spacing: tokens.space,
      borderRadius: tokens.border.radius,
      borderWidth: tokens.border.width,
      boxShadow: tokens.shadow,
      transitionDuration: tokens.duration,
    },
  },
  plugins: [],
};

/**
 * @layer app
 * @what Next.js App Router ルートレイアウト
 * @why 全ページ共通のレイアウト・プロバイダ設定
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/shared/ui/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Web App',
  description: 'Next.js + FSD Application',
};

// FOUC prevention script - must run before body renders
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('app:theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

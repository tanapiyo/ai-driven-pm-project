/**
 * @layer app
 * @what 認証関連ページのレイアウト
 * @why ログイン/登録ページ用の共通レイアウト
 */

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">{children}</main>
  );
}

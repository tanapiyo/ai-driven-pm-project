'use client';

/**
 * @layer app
 * @what ダッシュボードページ - H01 ロール別ダッシュボード
 * @why ロールに応じたパーソナライズされたホーム画面を提供
 */

import { DashboardHome } from '@/features/dashboard';

export default function DashboardPage() {
  return <DashboardHome />;
}

/**
 * @layer features
 * @segment settings
 * @what 設定ページのレイアウトラッパー（左メニュー + 右コンテンツ）
 */
import React from 'react';
import { SettingsNav } from './SettingsNav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex gap-8">
      <SettingsNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

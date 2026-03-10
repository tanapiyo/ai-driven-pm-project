/**
 * @what 辞書ファイルの構造・内容テスト
 * @why AC-001: 文言が辞書経由で提供されること / AC-002: 将来のi18nライブラリ移行を妨げない構造
 */

import { describe, it, expect } from 'vitest';
import { dictionary } from '../dictionary';

describe('dictionary', () => {
  describe('structure (AC-002: i18n library compatible)', () => {
    it('should be a plain object', () => {
      expect(typeof dictionary).toBe('object');
      expect(dictionary).not.toBeNull();
    });

    it('should have nested structure compatible with next-intl / react-i18next', () => {
      // Confirm top-level namespaces exist
      expect(dictionary.common).toBeDefined();
      expect(dictionary.auth).toBeDefined();
      expect(dictionary.navigation).toBeDefined();
      expect(dictionary.dashboard).toBeDefined();
      expect(dictionary.settings).toBeDefined();
      expect(dictionary.error).toBeDefined();
    });

    it('should contain only string leaf values (no functions or undefined)', () => {
      function assertStringLeaves(obj: unknown, path = ''): void {
        if (typeof obj === 'string') return;
        if (typeof obj === 'object' && obj !== null) {
          for (const [key, val] of Object.entries(obj)) {
            assertStringLeaves(val, path ? `${path}.${key}` : key);
          }
          return;
        }
        throw new Error(`Non-string leaf found at "${path}": ${typeof obj}`);
      }
      expect(() => assertStringLeaves(dictionary)).not.toThrow();
    });
  });

  describe('common namespace (AC-001)', () => {
    it('should have action labels', () => {
      expect(dictionary.common.actions.save).toBe('保存');
      expect(dictionary.common.actions.cancel).toBe('キャンセル');
      expect(dictionary.common.actions.close).toBe('閉じる');
      expect(dictionary.common.actions.logout).toBe('ログアウト');
      expect(dictionary.common.actions.loggingOut).toBe('ログアウト中...');
      expect(dictionary.common.actions.retry).toBe('もう一度試す');
      expect(dictionary.common.actions.change).toBe('変更');
    });
  });

  describe('auth namespace (AC-001)', () => {
    it('should have login strings', () => {
      expect(dictionary.auth.login.title).toBe('ログイン');
      expect(dictionary.auth.login.submitting).toBe('ログイン中...');
    });

    it('should have email field strings', () => {
      expect(dictionary.auth.login.email.label).toBe('メールアドレス');
      expect(dictionary.auth.login.email.placeholder).toBe('you@example.com');
    });

    it('should have password field strings', () => {
      expect(dictionary.auth.login.password.label).toBe('パスワード');
      expect(dictionary.auth.login.password.placeholder).toBe('パスワードを入力');
    });

    it('should have quick login strings', () => {
      expect(dictionary.auth.login.quickLogin.userButton).toBe('ユーザー');
      expect(dictionary.auth.login.quickLogin.adminButton).toBe('システム管理者');
    });
  });

  describe('navigation namespace (AC-001)', () => {
    it('should have sidebar strings', () => {
      expect(dictionary.navigation.sidebar.appName).toBe('Base App');
      expect(dictionary.navigation.sidebar.openSidebar).toBe('サイドバーを開く');
      expect(dictionary.navigation.sidebar.closeSidebar).toBe('サイドバーを閉じる');
      expect(dictionary.navigation.sidebar.adminSection).toBe('管理');
    });

    it('should have menu item labels', () => {
      expect(dictionary.navigation.menu.dashboard).toBe('ダッシュボード');
      expect(dictionary.navigation.menu.settings).toBe('設定');
      expect(dictionary.navigation.menu.adminUsers).toBe('ユーザー管理');
      expect(dictionary.navigation.menu.adminAuditLogs).toBe('監査ログ');
    });

    it('should have breadcrumb labels', () => {
      expect(dictionary.navigation.breadcrumb.home).toBe('ホーム');
      expect(dictionary.navigation.breadcrumb.dashboard).toBe('ダッシュボード');
      expect(dictionary.navigation.breadcrumb.settings).toBe('設定');
    });
  });

  describe('dashboard namespace (AC-001)', () => {
    it('should have dashboard strings', () => {
      expect(dictionary.dashboard.title).toBe('ダッシュボード');
      expect(dictionary.dashboard.welcome).toContain('{{name}}');
      expect(dictionary.dashboard.loggedInAs).toContain('{{role}}');
    });

    it('should have role labels', () => {
      expect(dictionary.dashboard.roles.admin).toBe('管理者');
      expect(dictionary.dashboard.roles.user).toBe('ユーザー');
    });
  });

  describe('settings namespace (AC-001)', () => {
    it('should have settings nav labels', () => {
      expect(dictionary.settings.nav.account).toBe('アカウント');
      expect(dictionary.settings.nav.appearance).toBe('外観');
    });

    it('should have account field labels', () => {
      expect(dictionary.settings.account.title).toBe('アカウント情報');
      expect(dictionary.settings.account.fields.userId).toBe('ユーザーID');
      expect(dictionary.settings.account.fields.email).toBe('メールアドレス');
      expect(dictionary.settings.account.fields.role).toBe('ロール');
      expect(dictionary.settings.account.fields.password).toBe('パスワード');
    });

    it('should have theme option labels', () => {
      expect(dictionary.settings.theme.heading).toBe('テーマ');
      expect(dictionary.settings.theme.options.light.label).toBe('ライト');
      expect(dictionary.settings.theme.options.dark.label).toBe('ダーク');
      expect(dictionary.settings.theme.options.system.label).toBe('システム設定に従う');
    });

    it('should have password change dialog strings', () => {
      expect(dictionary.settings.passwordChange.title).toBe('パスワードの変更');
      expect(dictionary.settings.passwordChange.closeButton).toBe('閉じる');
    });
  });

  describe('error namespace (AC-001)', () => {
    it('should have unexpected error strings', () => {
      expect(dictionary.error.unexpected.title).toBe('エラーが発生しました');
      expect(dictionary.error.unexpected.description).toBeDefined();
    });

    it('should have not found strings', () => {
      expect(dictionary.error.notFound.title).toBe('404 - ページが見つかりません');
      expect(dictionary.error.notFound.description).toBeDefined();
    });
  });
});

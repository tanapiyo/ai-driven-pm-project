/**
 * @what t() ヘルパー関数のユニットテスト
 * @why AC-001: 辞書経由の文言参照が正しく動作することを確認
 */

import { describe, it, expect } from 'vitest';
import { t } from '../t';

describe('t()', () => {
  describe('key lookup', () => {
    it('should return a string for a valid top-level key', () => {
      const result = t('common.actions.save');
      expect(result).toBe('保存');
    });

    it('should return a string for a deeply nested key', () => {
      const result = t('auth.login.email.label');
      expect(result).toBe('メールアドレス');
    });

    it('should return the key itself as fallback for unknown key', () => {
      // Cast to suppress TypeScript error - testing runtime fallback behaviour
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t('common.actions.nonExistentKey' as any);
      expect(result).toBe('common.actions.nonExistentKey');
    });

    it('should return key when intermediate node is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t('common.nonExistentNamespace.key' as any);
      expect(result).toBe('common.nonExistentNamespace.key');
    });
  });

  describe('variable interpolation', () => {
    it('should interpolate {{name}} in a template string', () => {
      const result = t('dashboard.welcome', { vars: { name: 'Alice' } });
      expect(result).toBe('ようこそ、Aliceさん');
    });

    it('should interpolate {{role}} in a template string', () => {
      const result = t('dashboard.loggedInAs', { vars: { role: '管理者' } });
      expect(result).toBe('管理者としてログイン中');
    });

    it('should leave unreplaced placeholders intact when variable is missing', () => {
      const result = t('dashboard.welcome', { vars: {} });
      expect(result).toBe('ようこそ、{{name}}さん');
    });

    it('should interpolate numeric values', () => {
      const result = t('dashboard.welcome', { vars: { name: 42 } });
      expect(result).toBe('ようこそ、42さん');
    });
  });

  describe('no options', () => {
    it('should return plain string when no vars provided', () => {
      const result = t('navigation.menu.dashboard');
      expect(typeof result).toBe('string');
      expect(result).toBe('ダッシュボード');
    });

    it('should return plain string with template when no vars provided', () => {
      const result = t('dashboard.welcome');
      expect(result).toBe('ようこそ、{{name}}さん');
    });
  });

  describe('return type', () => {
    it('should always return a string', () => {
      const keys = [
        'common.actions.save',
        'auth.login.title',
        'navigation.sidebar.appName',
        'settings.nav.account',
        'error.unexpected.title',
      ] as const;

      for (const key of keys) {
        expect(typeof t(key)).toBe('string');
      }
    });
  });
});

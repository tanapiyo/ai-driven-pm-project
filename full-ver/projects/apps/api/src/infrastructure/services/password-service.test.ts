/**
 * @what パスワードサービスのユニットテスト
 * @why セキュリティクリティカルなパスワード処理の正確性を保証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BcryptPasswordService } from './password-service.js';
import { PasswordHash } from '@/domain/auth/auth-user.js';

describe('BcryptPasswordService', () => {
  let service: BcryptPasswordService;

  beforeEach(() => {
    service = new BcryptPasswordService(12);
  });

  describe('hash', () => {
    it('should successfully hash a plain password', async () => {
      const result = await service.hash('password123');

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeInstanceOf(PasswordHash);
      expect(result.value?.value).toMatch(/^\$2[ab]\$12\$/); // bcrypt format with cost 12
    });

    it('should return different hashes for same password (salt)', async () => {
      const result1 = await service.hash('password123');
      const result2 = await service.hash('password123');

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
      expect(result1.value?.value).not.toBe(result2.value?.value);
    });

    it('should handle empty password', async () => {
      const result = await service.hash('');

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeInstanceOf(PasswordHash);
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000);
      const result = await service.hash(longPassword);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeInstanceOf(PasswordHash);
    });

    it('should handle unicode characters', async () => {
      const result = await service.hash('パスワード123!@#');

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBeInstanceOf(PasswordHash);
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const plainPassword = 'password123';
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      const verifyResult = await service.verify(plainPassword, hashResult.value!);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'password123';
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      const verifyResult = await service.verify('wrongpassword', hashResult.value!);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value).toBe(false);
    });

    it('should reject password with different case', async () => {
      const plainPassword = 'password123';
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      const verifyResult = await service.verify('PASSWORD123', hashResult.value!);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value).toBe(false);
    });

    it('should reject empty password when hash exists', async () => {
      const plainPassword = 'password123';
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      const verifyResult = await service.verify('', hashResult.value!);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value).toBe(false);
    });

    it('should handle verification with malformed hash gracefully', async () => {
      const malformedHash = PasswordHash.create('not-a-valid-bcrypt-hash');

      const verifyResult = await service.verify('password123', malformedHash);

      // bcryptは不正なハッシュに対してエラーを投げるか、falseを返す可能性がある
      // 実装の動作を確認: この場合はエラーハンドリングでfailになることを期待
      if (verifyResult.isSuccess()) {
        // 検証が成功した場合、falseが返されることを確認
        expect(verifyResult.value).toBe(false);
      } else {
        // 検証が失敗した場合、適切なエラーコードを確認
        expect(verifyResult.error).toBe('verify_failed');
      }
    });

    it('should verify unicode password correctly', async () => {
      const plainPassword = 'パスワード123!@#';
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      const verifyResult = await service.verify(plainPassword, hashResult.value!);

      expect(verifyResult.isSuccess()).toBe(true);
      expect(verifyResult.value).toBe(true);
    });
  });

  describe('validateStrength', () => {
    it('should accept strong password with letters and numbers', () => {
      const result = service.validateStrength('password123');

      expect(result.isSuccess()).toBe(true);
    });

    it('should accept password with uppercase and numbers', () => {
      const result = service.validateStrength('Password123');

      expect(result.isSuccess()).toBe(true);
    });

    it('should accept password with special characters', () => {
      const result = service.validateStrength('pass123!@#$');

      expect(result.isSuccess()).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = service.validateStrength('pass12');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
    });

    it('should reject password with only letters', () => {
      const result = service.validateStrength('onlyletters');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
    });

    it('should reject password with only numbers', () => {
      const result = service.validateStrength('12345678');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
    });

    it('should reject empty password', () => {
      const result = service.validateStrength('');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
    });

    it('should accept minimum length password (8 chars with letter and number)', () => {
      const result = service.validateStrength('pass1234');

      expect(result.isSuccess()).toBe(true);
    });

    it('should reject 7 character password even with letter and number', () => {
      const result = service.validateStrength('pass123');

      expect(result.isFailure()).toBe(true);
      expect(result.error).toBe('weak_password');
    });
  });

  describe('bcrypt rounds configuration', () => {
    it('should use configurable cost rounds', async () => {
      const serviceWith10Rounds = new BcryptPasswordService(10);
      const result = await serviceWith10Rounds.hash('password123');

      expect(result.isSuccess()).toBe(true);
      expect(result.value?.value).toMatch(/^\$2[ab]\$10\$/);
    });

    it('should default to 12 rounds when not specified', async () => {
      const defaultService = new BcryptPasswordService();
      const result = await defaultService.hash('password123');

      expect(result.isSuccess()).toBe(true);
      expect(result.value?.value).toMatch(/^\$2[ab]\$12\$/);
    });
  });

  describe('integration: hash and verify flow', () => {
    it('should complete full hash-verify cycle for valid password', async () => {
      const plainPassword = 'SecurePass123';

      // 1. Validate strength
      const strengthResult = service.validateStrength(plainPassword);
      expect(strengthResult.isSuccess()).toBe(true);

      // 2. Hash password
      const hashResult = await service.hash(plainPassword);
      expect(hashResult.isSuccess()).toBe(true);

      // 3. Verify correct password
      const verifyCorrect = await service.verify(plainPassword, hashResult.value!);
      expect(verifyCorrect.isSuccess()).toBe(true);
      expect(verifyCorrect.value).toBe(true);

      // 4. Verify incorrect password
      const verifyIncorrect = await service.verify('WrongPass123', hashResult.value!);
      expect(verifyIncorrect.isSuccess()).toBe(true);
      expect(verifyIncorrect.value).toBe(false);
    });

    it('should reject weak password in full cycle', () => {
      const weakPassword = 'weak';

      // Strength validation should fail
      const strengthResult = service.validateStrength(weakPassword);
      expect(strengthResult.isFailure()).toBe(true);
      expect(strengthResult.error).toBe('weak_password');
    });
  });
});

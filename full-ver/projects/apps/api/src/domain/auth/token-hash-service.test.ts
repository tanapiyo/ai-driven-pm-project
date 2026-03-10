/**
 * @what TokenHashService ドメインインターフェースの型契約テスト
 * @why トークン生成・ハッシュ化の抽象インターフェースがドメイン層の規約を満たすことを保証する
 */

import { describe, it, expect, vi } from 'vitest';
import type { TokenHashService } from './token-hash-service.js';
import { TokenHash } from './refresh-token.js';

describe('TokenHashService interface contract (mock implementation)', () => {
  const createMockTokenHashService = (): TokenHashService => ({
    generateToken: vi.fn().mockReturnValue('random-token-abc123'),
    hashToken: vi.fn().mockImplementation((token: string) => TokenHash.create(`sha256:${token}`)),
  });

  it('should generate a random token string', () => {
    const service = createMockTokenHashService();

    const token = service.generateToken();

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should hash a token and return TokenHash', () => {
    const service = createMockTokenHashService();

    const plainToken = 'plain-text-token-value';
    const hash = service.hashToken(plainToken);

    expect(hash).toBeInstanceOf(TokenHash);
    expect(hash.value).toBe(`sha256:${plainToken}`);
  });

  it('should return different tokens on each generateToken call', () => {
    const service: TokenHashService = {
      generateToken: vi.fn().mockReturnValueOnce('token-one').mockReturnValueOnce('token-two'),
      hashToken: vi.fn().mockImplementation((token: string) => TokenHash.create(token)),
    };

    const token1 = service.generateToken();
    const token2 = service.generateToken();

    expect(token1).not.toBe(token2);
  });

  it('should produce same hash for same input (deterministic)', () => {
    const deterministicService: TokenHashService = {
      generateToken: vi.fn().mockReturnValue('new-token'),
      hashToken: vi.fn().mockImplementation((token: string) => {
        const fakeHash = `hash:${token}`;
        return TokenHash.create(fakeHash);
      }),
    };

    const hash1 = deterministicService.hashToken('same-token');
    const hash2 = deterministicService.hashToken('same-token');

    expect(hash1.equals(hash2)).toBe(true);
  });

  it('should return TokenHash with non-empty value', () => {
    const service = createMockTokenHashService();

    const hash = service.hashToken('some-token');

    expect(hash.value.length).toBeGreaterThan(0);
  });
});

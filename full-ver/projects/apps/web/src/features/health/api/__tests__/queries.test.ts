/**
 * @what fetchHealth クエリ関数のユニットテスト
 * @why AC-001/AC-003: Orval 生成クライアント（getHealth）を使って /health を呼び出すことを確認
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHealth } from '../queries';

// @monorepo/api-contract の getHealth をモック（AC-001: 生成クライアント使用を確認）
vi.mock('@monorepo/api-contract', () => ({
  getHealth: vi.fn(),
}));

import { getHealth } from '@monorepo/api-contract';

const mockGetHealth = vi.mocked(getHealth);

describe('fetchHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the generated getHealth client (AC-001: Pattern A)', async () => {
    const mockResponse = {
      data: { status: 'ok' as const, timestamp: '2026-03-04T13:00:00Z' },
      status: 200 as const,
      headers: new Headers(),
    };
    mockGetHealth.mockResolvedValue(mockResponse);

    await fetchHealth();

    expect(mockGetHealth).toHaveBeenCalledOnce();
  });

  it('should return the data property from the generated response', async () => {
    const mockData = { status: 'ok' as const, timestamp: '2026-03-04T13:00:00Z' };
    mockGetHealth.mockResolvedValue({
      data: mockData,
      status: 200 as const,
      headers: new Headers(),
    });

    const result = await fetchHealth();

    expect(result).toEqual(mockData);
  });

  it('should propagate errors from the generated client', async () => {
    mockGetHealth.mockRejectedValue(new Error('API Error'));

    await expect(fetchHealth()).rejects.toThrow('API Error');
  });
});

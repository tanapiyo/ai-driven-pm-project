/**
 * @what useHealthCheck フックのユニットテスト
 * @why AC-004: 生成クライアント経由の health check フックをテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHealthCheck } from '../useHealthCheck';

// @monorepo/api-contract の getHealth をモック
vi.mock('@monorepo/api-contract', () => ({
  getHealth: vi.fn(),
}));

import { getHealth } from '@monorepo/api-contract';

const mockGetHealth = vi.mocked(getHealth);

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null data, not loading, no error', () => {
    const { result } = renderHook(() => useHealthCheck());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set isLoading to true during check', async () => {
    let resolveCheck!: (value: {
      data: { status: 'ok'; timestamp: string };
      status: 200;
      headers: Headers;
    }) => void;
    mockGetHealth.mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      })
    );

    const { result } = renderHook(() => useHealthCheck());

    act(() => {
      void result.current.check();
    });

    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolveCheck({
        data: { status: 'ok', timestamp: '2026-03-04T00:00:00Z' },
        status: 200,
        headers: new Headers(),
      });
    });
  });

  it('should set data on successful health check', async () => {
    const mockResponse = {
      data: { status: 'ok' as const, timestamp: '2026-03-04T13:00:00Z' },
      status: 200 as const,
      headers: new Headers(),
    };
    mockGetHealth.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useHealthCheck());

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.data).toEqual({ status: 'ok', timestamp: '2026-03-04T13:00:00Z' });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set error on failed health check', async () => {
    mockGetHealth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useHealthCheck());

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('should set fallback error message for non-Error objects', async () => {
    mockGetHealth.mockRejectedValue('unknown error');

    const { result } = renderHook(() => useHealthCheck());

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.error).toBe('Failed to check health');
  });

  it('should reset state when reset is called', async () => {
    const mockResponse = {
      data: { status: 'ok' as const, timestamp: '2026-03-04T13:00:00Z' },
      status: 200 as const,
      headers: new Headers(),
    };
    mockGetHealth.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useHealthCheck());

    await act(async () => {
      await result.current.check();
    });

    expect(result.current.data).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

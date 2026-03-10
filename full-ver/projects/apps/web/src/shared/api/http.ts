/**
 * @layer shared
 * @segment api
 * @what HTTP クライアントラッパー
 *
 * baseURL、認証ヘッダー、エラー正規化を一元管理
 * 生成クライアントはこのラッパーを使用する
 */
import { getConfig } from '@/shared/config';
import { getCsrfToken } from '@/shared/lib/csrf';

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * 正規化されたAPIエラー
 */
export class NormalizedApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'NormalizedApiError';
  }
}

/**
 * HTTP ラッパー
 * fetch を直接使わず、このラッパー経由でリクエストを行う
 *
 * accessToken はメモリ内（Zustand state）から取得
 * refreshToken は HttpOnly Cookie から自動送信
 */
export async function apiClient<T>(
  path: string,
  options: Omit<RequestInit, 'headers'> & ApiClientConfig = {}
): Promise<T> {
  const config = getConfig();
  const { baseUrl = config.apiBaseUrl, headers: customHeaders, ...fetchOptions } = options;

  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // accessToken はメモリ内（Zustand state）から取得（localStorage には保存しない）
  // 動的に取得するため、遅延 import で circular dependency を回避
  if (typeof window !== 'undefined') {
    try {
      const { useAuthStore } = await import('@/features/auth/model/store');
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // Store にアクセスできない場合はトークンなしで続行
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to get access token from store:', error);
      }
    }

    // CSRF トークンを Cookie から取得してヘッダーに設定（Double-Submit Cookie パターン）
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // refreshToken Cookie を自動送信
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new NormalizedApiError(
      response.status,
      errorBody.message || `HTTP Error: ${response.status}`,
      errorBody.code,
      errorBody.details
    );
  }

  // 204 No Content の場合
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

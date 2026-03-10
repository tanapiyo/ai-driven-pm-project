/**
 * @what カスタム HTTP クライアント（orval の mutator 用）
 * @why baseURL、認証、エラーハンドリングを一元化
 */

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

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

// 実行時に設定される baseURL（アプリ側で設定）
let _baseUrl = 'http://localhost:3001';
let _getAuthToken: (() => string | null) | undefined;

/**
 * API クライアントの設定を初期化
 */
export function configureApiClient(options: {
  baseUrl: string;
  getAuthToken?: () => string | null;
}) {
  _baseUrl = options.baseUrl;
  _getAuthToken = options.getAuthToken;
}

/**
 * Orval の mutator として使用するカスタム fetch
 */
export async function customFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const fullUrl = url.startsWith('http') ? url : `${_baseUrl}${url}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // 認証トークンがあれば追加
  const token = _getAuthToken?.();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => ({}));
    const errorData =
      typeof errorBody === 'object' && errorBody !== null
        ? (errorBody as Record<string, unknown>)
        : {};
    throw new NormalizedApiError(
      response.status,
      typeof errorData.message === 'string' ? errorData.message : `HTTP Error: ${response.status}`,
      typeof errorData.code === 'string' ? errorData.code : undefined,
      errorData.details
    );
  }

  // 204 No Content の場合
  if (response.status === 204) {
    return { data: undefined, status: response.status, headers: response.headers } as T;
  }

  const data: unknown = await response.json();
  return { data, status: response.status, headers: response.headers } as T;
}

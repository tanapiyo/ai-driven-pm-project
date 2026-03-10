/**
 * @layer shared
 * @segment api
 * @what File upload API helper
 *
 * Handles multipart/form-data uploads with authentication
 */
import { getConfig } from '@/shared/config';
import { getCsrfToken } from '@/shared/lib/csrf';
import { NormalizedApiError } from './http';

export interface UploadResult {
  imageUrl: string;
}

/**
 * Upload a file via multipart/form-data
 *
 * @param path - API path (e.g., /users/{id}/avatar)
 * @param file - File to upload
 * @param fieldName - Form field name (default: 'image')
 * @returns Upload result with URL
 */
export async function uploadFile(
  path: string,
  file: File,
  fieldName: string = 'image'
): Promise<UploadResult> {
  const config = getConfig();
  const url = `${config.apiBaseUrl}${path}`;

  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: Record<string, string> = {};

  // Get access token from auth store
  if (typeof window !== 'undefined') {
    try {
      const { useAuthStore } = await import('@/features/auth/model/store');
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Store not available
    }

    // CSRF token
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new NormalizedApiError(
      response.status,
      errorBody.message || `Upload failed: ${response.status}`,
      errorBody.code,
      errorBody.details
    );
  }

  return response.json() as Promise<UploadResult>;
}

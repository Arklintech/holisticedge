/**
 * Safe API Client & Response Handler (HE-QA-02)
 * Prevents "Unexpected end of JSON input" and infrastructure proxy crash cascades.
 * Automatically inspects Content-Type, catches network errors/aborts/timeouts,
 * parses JSON safely, and returns typed, predictable ApiResponse<T> objects.
 */

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  isNetworkError?: boolean;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetch<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 15000, headers: customHeaders, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  // Attach the server-issued admin token for same-origin API calls; explicit headers override it
  const mergedHeaders: Record<string, string> = {};
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      mergedHeaders['Authorization'] = `Bearer ${adminToken}`;
    }
  }

  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        mergedHeaders[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        mergedHeaders[key] = value;
      });
    } else {
      Object.assign(mergedHeaders, customHeaders);
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: mergedHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let responseData: any = null;
    let errorMessage: string | null = null;

    const rawText = await response.text();

    if (rawText && rawText.trim().length > 0) {
      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          responseData = JSON.parse(rawText);
        } catch {
          errorMessage = 'Malformed JSON received from server.';
        }
      } else {
        if (!response.ok) {
          errorMessage = `Server returned status ${response.status} (${response.statusText || 'Error'}).`;
        } else {
          responseData = rawText;
        }
      }
    } else {
      if (!response.ok) {
        errorMessage = `Server returned empty error response (${response.status}).`;
      }
    }

    if (!response.ok) {
      if (responseData && typeof responseData === 'object' && responseData.error) {
        errorMessage = responseData.error;
      } else if (!errorMessage) {
        errorMessage = `Request failed with status ${response.status}`;
      }

      return {
        ok: false,
        status: response.status,
        data: null,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: responseData as T,
      error: errorMessage,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    const isAbort = err?.name === 'AbortError';
    const errorMsg = isAbort
      ? 'Request timed out or was cancelled.'
      : (err?.message || 'Network connection failed or backend is offline.');

    return {
      ok: false,
      status: 0,
      data: null,
      error: errorMsg,
      isNetworkError: true,
    };
  }
}

export const apiClient = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    safeFetch<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    safeFetch<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    safeFetch<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    safeFetch<T>(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    safeFetch<T>(url, { ...options, method: 'DELETE' }),
};

import { ApiResponse, ApiError } from '@/types/api';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl = '';

  private getFullUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${window.location.origin}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.pathname + url.search;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, headers, ...customConfig } = options;
    const url = this.getFullUrl(endpoint, params);

    const defaultHeaders: HeadersInit = {
      'Accept': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        (defaultHeaders as any)['Authorization'] = `Bearer ${token}`;
      }
    }

    if (!(customConfig.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      credentials: 'include',
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Attempt automatic refresh if not already an auth route
        if (!url.includes('/auth/login') && !url.includes('/auth/refresh') && !url.includes('/superadmin/login')) {
          try {
            const refreshRes = await fetch('/api/v1/auth/refresh', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData?.data?.tokens?.accessToken || refreshData?.tokens?.accessToken;
              if (newToken && typeof window !== 'undefined') {
                localStorage.setItem('auth_token', newToken);
                (config.headers as any)['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await fetch(url, config);
                if (retryResponse.ok) {
                  const retryJson = retryResponse.headers.get('content-type')?.includes('application/json');
                  return (retryJson ? await retryResponse.json() : await retryResponse.text()) as ApiResponse<T>;
                }
              }
            }
          } catch (_) {}
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/super-admin')) {
            window.location.href = '/login';
          }
        }
        throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        let msg = `فشل الطلب مع رمز الحالة ${response.status}`;
        if (typeof data?.message === 'string') {
          msg = data.message;
        } else if (typeof data?.error === 'string') {
          msg = data.error;
        } else if (data?.message && typeof data.message === 'object') {
          msg = data.message.message || data.message.code || JSON.stringify(data.message);
        } else if (data?.error && typeof data.error === 'object') {
          msg = data.error.message || data.error.code || JSON.stringify(data.error);
        } else if (data && typeof data === 'object') {
          msg = (data as any).message || (data as any).error || (data as any).code || JSON.stringify(data);
        } else if (typeof data === 'string' && data.length < 300) {
          msg = data;
        }

        const errorObj: ApiError = {
          message: typeof msg === 'string' ? msg : JSON.stringify(msg),
          statusCode: response.status,
          details: data,
        };
        throw errorObj;
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      const apiError: ApiError = {
        message: err?.message || 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً',
        statusCode: err?.statusCode || 500,
        details: err?.details || err,
      };
      throw apiError;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();

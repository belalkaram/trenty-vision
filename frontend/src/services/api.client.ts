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

    if (!(customConfig.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/super-admin')) {
          window.location.href = '/login';
        }
        throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorObj: ApiError = {
          message: data?.error || data?.message || `فشل الطلب مع رمز الحالة ${response.status}`,
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

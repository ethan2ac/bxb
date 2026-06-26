import type { ApiResponse } from '../types';

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    const data: ApiResponse<T> = await res.json();
    if (!data.ok) {
      throw new ApiError(data.error || 'Request failed', res.status);
    }
    return data.data as T;
  }

  get<T>(url: string): Promise<T> {
    return this.request<T>(url);
  }

  post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, { method: 'PUT', body: JSON.stringify(body) });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const api = new ApiClient();

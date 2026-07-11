import type { ApiResponse } from '../types';

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
    } catch {
      throw new ApiError('Network error — check your connection and try again', 0);
    }

    // A non-JSON body (Cloudflare error/challenge page, cold-start hiccup,
    // etc.) would otherwise surface as a raw JSON.parse error in the UI.
    let data: ApiResponse<T>;
    try {
      data = await res.json();
    } catch {
      throw new ApiError('Something went wrong — please try again', res.status);
    }

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

  delete<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined });
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

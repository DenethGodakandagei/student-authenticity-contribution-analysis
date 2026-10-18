// app/utils/api.ts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Simple wrapper around fetch that injects the base URL from .env.local,
 * adds JSON headers, and returns a typed result.
 */
export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown
): Promise<ApiResponse<T>> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';
  const url = `${base}${path}`;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  };

  if (body !== undefined) init.body = JSON.stringify(body);

  try {
    const res = await fetch(url, init);
    const data = (await res.json()) as T;
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

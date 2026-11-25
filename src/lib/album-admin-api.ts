const apiBase = String(import.meta.env.BASE_URL) + 'api/album-admin';

export class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 429 ? 'Too many attempts. Wait a few minutes and try again.'
      : response.status === 413 ? 'The uploaded files are too large.'
      : 'The editor could not complete the request. Try again.';
    throw new RequestError(response.status, body?.error ?? message);
  }
  if (!body) throw new Error('The editor returned an invalid response.');
  return body;
}

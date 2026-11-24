import { vi } from 'vitest';

/** The URL of whatever fetch was called with, as a string. */
export function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

type Route = (url: URL, init?: RequestInit) => { status?: number; body: unknown } | undefined;

/** Installs a fetch mock that answers by URL; unmatched requests return 404. */
export function installFetch(route: Route) {
  const mock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(urlOf(input), 'http://localhost');
    const reply = route(url, init) ?? { status: 404, body: { error: 'not found' } };
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

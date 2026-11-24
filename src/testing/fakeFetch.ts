import { vi } from 'vitest';

type Route = (url: URL, init?: RequestInit) => { status?: number; body: unknown } | undefined;

/** Installs a fetch mock that answers by URL; unmatched requests return 404. */
export function installFetch(route: Route) {
  const mock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, 'http://localhost');
    const reply = route(url, init) ?? { status: 404, body: { error: 'not found' } };
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

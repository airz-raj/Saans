import {
  BodyTooLargeError,
  clientKey,
  fail,
  fetchWithTimeout,
  isSameOrigin,
  json,
  readJson,
} from '../../api/_lib/http';
import { log } from '../../api/_lib/log';
import { createRateLimiter } from '../../api/_lib/rateLimit';

const request = (headers: Record<string, string> = {}, body?: string) =>
  new Request('https://saans.test/api/x', { method: body ? 'POST' : 'GET', headers, body });

describe('responses', () => {
  it('sends JSON with nosniff and no-store by default', async () => {
    const response = json({ ok: true });
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('builds error bodies with extra fields', async () => {
    const response = fail(418, 'teapot', { fallback: true });
    expect(response.status).toBe(418);
    expect(await response.json()).toEqual({ error: 'teapot', fallback: true });
  });
});

describe('clientKey', () => {
  it.each([
    [{ 'x-forwarded-for': '1.1.1.1, 10.0.0.1' }, '1.1.1.1'],
    [{ 'x-real-ip': '2.2.2.2' }, '2.2.2.2'],
    [{ 'x-forwarded-for': ' ' }, 'anonymous'],
    [{}, 'anonymous'],
  ])('reads %j as %s', (headers, expected) => {
    expect(clientKey(request(headers))).toBe(expected);
  });
});

describe('isSameOrigin', () => {
  it.each([
    [{}, true],
    [{ origin: 'https://saans.test' }, true],
    [{ origin: 'https://evil.test' }, false],
    [{ origin: 'not a url' }, false],
    [{ 'sec-fetch-site': 'cross-site' }, false],
    [{ 'sec-fetch-site': 'same-origin', origin: 'https://saans.test' }, true],
  ])('treats %j as same-origin: %s', (headers, expected) => {
    expect(isSameOrigin(request(headers))).toBe(expected);
  });
});

describe('readJson', () => {
  it('parses small bodies', async () => {
    await expect(readJson(request({}, '{"a":1}'))).resolves.toEqual({ a: 1 });
  });

  it('rejects by declared length before reading', async () => {
    await expect(readJson(request({ 'content-length': '999999' }, '{}'))).rejects.toBeInstanceOf(
      BodyTooLargeError,
    );
  });

  it('rejects by actual size, counting bytes not characters', async () => {
    const body = JSON.stringify({ text: 'स'.repeat(10) }); // 3 bytes per character
    await expect(readJson(request({}, body), 20)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('throws on invalid JSON', async () => {
    await expect(readJson(request({}, '{nope'))).rejects.toThrow(SyntaxError);
  });
});

describe('fetchWithTimeout', () => {
  const hanging = ((_url: string, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as typeof fetch;

  it('aborts slow upstreams', async () => {
    await expect(fetchWithTimeout('https://x.test', {}, 5, hanging)).rejects.toThrow('aborted');
  });

  it('honours a caller signal, even one already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchWithTimeout('https://x.test', { signal: controller.signal }, 10_000, hanging),
    ).rejects.toThrow('aborted');
    const later = new AbortController();
    const pending = fetchWithTimeout('https://x.test', { signal: later.signal }, 10_000, hanging);
    later.abort();
    await expect(pending).rejects.toThrow('aborted');
  });

  it('passes successful responses through', async () => {
    const ok = (() => Promise.resolve(new Response('fine'))) as typeof fetch;
    await expect((await fetchWithTimeout('https://x.test', {}, 100, ok)).text()).resolves.toBe(
      'fine',
    );
  });
});

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('writes one JSON line per level', () => {
    log('error', 'a', new Error('boom'));
    log('warn', 'b', 'text');
    log('info', 'c');
    expect(console.error).toHaveBeenCalledWith('{"level":"error","event":"a","detail":"boom"}');
    expect(console.warn).toHaveBeenCalledWith('{"level":"warn","event":"b","detail":"text"}');
    expect(console.info).toHaveBeenCalledWith('{"level":"info","event":"c"}');
  });

  it('serialises objects and survives circular values', () => {
    expect(log('info', 'd', { n: 1 }).detail).toBe('{"n":1}');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(log('info', 'e', circular).detail).toBe('unserialisable detail');
  });
});

describe('rate limiter memory bound', () => {
  it('forgets old clients once too many keys are tracked', () => {
    const limiter = createRateLimiter(1, 1, 2);
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('a', 1).allowed).toBe(false);
    limiter.take('b', 2);
    limiter.take('c', 3);
    limiter.take('d', 4); // exceeds maxKeys → buckets reset
    expect(limiter.take('a', 5).allowed).toBe(true);
  });
});

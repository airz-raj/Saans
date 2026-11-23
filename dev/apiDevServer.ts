/**
 * Vite dev-server plugin that serves the Vercel functions in `/api` locally,
 * so `npm run dev` works without the Vercel CLI. Production never uses this file.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

type Handler = (request: Request) => Promise<Response> | Response;
const ROUTE = /^\/api\/([a-z]+)(?:\?.*)?$/;

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

function toRequest(req: IncomingMessage, body: Buffer | undefined): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
  }
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  return new Request(url, {
    method: req.method ?? 'GET',
    headers,
    body: body ? new Uint8Array(body) : null,
  });
}

async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const match = ROUTE.exec(req.url ?? '');
  if (!match) return false;
  const mod = (await server.ssrLoadModule(`/api/${match[1]}.ts`)) as Record<string, Handler>;
  const handler = mod[req.method ?? 'GET'];
  const response = handler
    ? await handler(toRequest(req, await readBody(req)))
    : new Response('Method Not Allowed', { status: 405 });
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}

export function apiDevServer(): Plugin {
  return {
    name: 'saans-api-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handle(server, req, res)
          .then((handled) => {
            if (!handled) next();
          })
          .catch(next);
      });
    },
  };
}

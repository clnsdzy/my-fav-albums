import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { catalogView, prepareCatalogChange, receipt } from '../server/album-admin/catalog';
import { AdminError } from '../server/album-admin/upload';
import type { Album } from '../src/types';

const pinPattern = /^\d{6,12}$/;
const sessionLifetime = 8 * 60 * 60 * 1000;
const attemptWindow = 5 * 60 * 1000;
const coverLimit = 10 * 1024 * 1024;
const thumbnailLimit = 1024 * 1024;
const cookieName = 'album_admin_session';
const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function reply(res: ServerResponse, status: number, data: object) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

async function readJson(req: IncomingMessage, limit: number): Promise<Record<string, unknown>> {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') {
    throw new AdminError(415, 'Send the form as JSON.');
  }
  if (Number(req.headers['content-length']) > limit) {
    throw new AdminError(413, 'The uploaded files are too large.');
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new AdminError(413, 'The uploaded files are too large.');
    chunks.push(chunk);
  }

  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // The response deliberately omits the request content.
  }
  throw new AdminError(400, 'The form could not be read.');
}

async function readCatalog(root: string): Promise<Album[]> {
  return JSON.parse(await readFile(resolve(root, 'src/album-catalog.json'), 'utf8'));
}

async function saveCatalog(root: string, body: Record<string, unknown>) {
  const applyChange = prepareCatalogChange(body, { cover: coverLimit, thumbnail: thumbnailLimit });

  const lockPath = resolve(root, 'node_modules/.album-catalog-write.lock');
  const lock = await open(lockPath, 'wx').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EEXIST') throw new AdminError(409, 'Another album save is in progress. Try again in a moment.');
    throw error;
  });

  const created: string[] = [];
  const catalogPath = resolve(root, 'src/album-catalog.json');
  const stagedCatalog = `${catalogPath}.${randomBytes(8).toString('hex')}.tmp`;
  let committed = false;
  try {
    const change = applyChange(await readCatalog(root));
    for (const [path, contents] of change.images ?? []) {
      const destination = resolve(root, 'public', path);
      const file = await open(destination, 'wx').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'EEXIST') throw new AdminError(409, 'A cover file already uses that slug. Choose a different slug.');
        throw error;
      });
      created.push(destination);
      try {
        await file.writeFile(contents);
      } finally {
        await file.close();
      }
    }

    await writeFile(stagedCatalog, JSON.stringify(change.updated, null, 2) + '\n', { flag: 'wx' });
    await rename(stagedCatalog, catalogPath);
    committed = true;
    return { ...receipt(change), catalog: catalogView(change.updated) };
  } finally {
    if (!committed) await Promise.allSettled([...created, stagedCatalog].map(path => unlink(path)));
    await lock.close();
    await unlink(lockPath);
  }
}

function pinHash(pin: string) {
  return createHash('sha256').update(pin).digest();
}

export function albumAdmin(pin: string): Plugin {
  return {
    name: 'local-album-admin',
    apply: 'serve',
    configureServer(server) {
      const path = `${server.config.base}api/album-admin`;
      const pinConfigured = pinPattern.test(pin);
      const expectedPin = pinHash(pin);
      let session: { token: string; expiresAt: number; savedAlbum?: { slug: string; title: string } } | undefined;
      let failedAttempts = 0;
      let attemptExpiresAt = 0;

      async function handle(req: IncomingMessage, res: ServerResponse) {
        const { host, origin, cookie = '' } = req.headers;
        if (!loopbackAddresses.has(req.socket.remoteAddress ?? '') || !host || !loopbackHost.test(host)) {
          throw new AdminError(403, 'Open the editor from localhost on this computer.');
        }
        const secure = server.config.server.https ? '; Secure' : '';
        const protocol = secure ? 'https' : 'http';
        if (req.method !== 'GET' && origin !== `${protocol}://${host}`) {
          throw new AdminError(403, 'The request must come from the local editor.');
        }

        const route = req.url?.split('?')[0];
        const token = cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))
          ?.slice(cookieName.length + 1);
        const authenticated = Boolean(session && session.expiresAt > Date.now() && session.token === token);
        const cookieOptions = `Path=${path}; HttpOnly; SameSite=Strict${secure}`;

        if (route === '/session' && req.method === 'GET') {
          return reply(res, 200, { pinConfigured, authenticated, savedAlbum: authenticated ? session?.savedAlbum : undefined });
        }
        if (!pinConfigured) throw new AdminError(503, 'Set ALBUM_ADMIN_PIN in .env.local and restart Vite.');

        if (route === '/session' && req.method === 'POST') {
          const body = await readJson(req, 1024);
          const now = Date.now();
          if (now >= attemptExpiresAt) {
            failedAttempts = 0;
            attemptExpiresAt = now + attemptWindow;
          }
          if (failedAttempts >= 5) throw new AdminError(429, 'Too many attempts. Wait a few minutes and try again.');
          if (typeof body.pin !== 'string' || !timingSafeEqual(pinHash(body.pin), expectedPin)) {
            failedAttempts++;
            throw new AdminError(401, 'That PIN did not match.');
          }
          failedAttempts = 0;
          session = { token: randomBytes(32).toString('hex'), expiresAt: now + sessionLifetime };
          res.setHeader('Set-Cookie', `${cookieName}=${session.token}; ${cookieOptions}; Max-Age=${sessionLifetime / 1000}`);
          return reply(res, 200, { authenticated: true });
        }

        if (route === '/session' && req.method === 'DELETE') {
          if (authenticated) session = undefined;
          res.setHeader('Set-Cookie', `${cookieName}=; ${cookieOptions}; Max-Age=0`);
          return reply(res, 200, { authenticated: false });
        }

        if (route === '/albums') {
          if (!authenticated) throw new AdminError(401, 'Unlock the editor to manage albums.');
          if (req.method === 'GET') return reply(res, 200, catalogView(await readCatalog(server.config.root)));
          if (req.method === 'POST') {
            const body = await readJson(req, 16 * 1024 * 1024);
            const saved = await saveCatalog(server.config.root, body);
            if (session?.token === token && saved.slug && saved.title && (body.action === 'create' || body.action === undefined)) {
              session.savedAlbum = { slug: saved.slug, title: saved.title };
            }
            return reply(res, 201, saved);
          }
        }

        throw new AdminError(404, 'The editor route was not found.');
      }

      server.middlewares.use(path, (req, res) => {
        void handle(req, res).catch((error: unknown) => {
          if (error instanceof AdminError) return reply(res, error.status, { error: error.message });
          server.config.logger.error('The local album editor encountered a storage error.');
          reply(res, 500, { error: 'The album could not be saved. Check that the catalog and cover directories are writable.' });
        });
      });
    },
  };
}

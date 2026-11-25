import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { getAlbumThumbnailPath } from '../src/lib/album-assets';
import { albumSlugPattern, appleAlbumUrlPattern, spotifyIdPattern } from '../src/lib/catalog-validation';
import type { Album } from '../src/types';

const pinPattern = /^\d{6,12}$/;
const sessionLifetime = 8 * 60 * 60 * 1000;
const attemptWindow = 5 * 60 * 1000;
const coverLimit = 10 * 1024 * 1024;
const thumbnailLimit = 1024 * 1024;
const cookieName = 'album_admin_session';
const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

class AdminError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

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

function requiredText(input: unknown, field: string, maxLength: number) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value || value.length > maxLength) {
    throw new AdminError(400, `${field} must be between 1 and ${maxLength} characters.`);
  }
  return value;
}

function coverBuffer(input: unknown, limit: number, label: string) {
  if (typeof input !== 'string' || input.length > Math.ceil(limit / 3) * 4
    || input.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input)) {
    throw new AdminError(400, `Choose a valid ${label} within the size limit.`);
  }
  const buffer = Buffer.from(input, 'base64');
  if (buffer.length > limit) throw new AdminError(413, `The ${label} is too large.`);
  return buffer;
}

function imageExtension(buffer: Buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
}

function parseAlbum(body: Record<string, unknown>) {
  const album = requiredText(body.album, 'Album title', 120);
  const artist = requiredText(body.artist, 'Artist', 120);
  const genre = requiredText(body.genre, 'Genre', 60);
  const summary = requiredText(body.summary, 'Summary', 4000);
  const year = Number(body.year);
  const rating = Number(body.rating);
  const rank = body.rank === '' ? undefined : Number(body.rank);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new AdminError(400, 'Enter a four-digit release year from 1900 to 2100.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AdminError(400, 'Choose a rating from 1 to 5.');
  }
  if (rank !== undefined && (!Number.isSafeInteger(rank) || rank < 1)) {
    throw new AdminError(400, 'Enter a positive whole number for rank.');
  }

  const slug = (typeof body.slug === 'string' && body.slug.trim()) ||
    album.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase()
      .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug.length > 120 || !albumSlugPattern.test(slug)) {
    throw new AdminError(400, 'Enter a URL slug with lowercase letters, numbers, or hyphens.');
  }

  const spotify = requiredText(body.spotify, 'Spotify album link or ID', 500);
  const spotifyId = spotify.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?album\/([A-Za-z0-9]{22})\/?(?:[?#].*)?$/)?.[1] ?? spotify;
  if (!spotifyIdPattern.test(spotifyId)) {
    throw new AdminError(400, 'Enter a Spotify album link or its 22-character ID.');
  }
  const appleUrl = requiredText(body.apple, 'Apple Music album link', 500).split(/[?#]/)[0].replace(/\/$/, '');
  if (!appleAlbumUrlPattern.test(appleUrl)) {
    throw new AdminError(400, 'Enter an Apple Music album URL with its numeric ID.');
  }

  return { album, artist, genre, summary, year, rating, rank, slug, spotify_id: spotifyId, apple_url: appleUrl };
}

async function readCatalog(root: string): Promise<Album[]> {
  return JSON.parse(await readFile(resolve(root, 'src/album-catalog.json'), 'utf8'));
}

function nextRank(albums: Album[]) {
  return albums.reduce((highest, album) => Math.max(highest, album.rank), 0) + 1;
}

async function saveAlbum(root: string, body: Record<string, unknown>) {
  const { rank: requestedRank, ...album } = parseAlbum(body);
  const cover = coverBuffer(body.cover, coverLimit, 'album cover');
  const thumbnail = coverBuffer(body.thumbnail, thumbnailLimit, 'WebP thumbnail');
  const extension = imageExtension(cover);
  if (!extension || imageExtension(thumbnail) !== 'webp') {
    throw new AdminError(400, 'Choose a JPEG, PNG, or WebP cover.');
  }

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
    const catalog = await readCatalog(root);
    const rank = requestedRank ?? nextRank(catalog);
    if (rank > nextRank(catalog)) {
      throw new AdminError(400, `Rank must be from 1 to ${nextRank(catalog)}.`);
    }
    if (catalog.some(existing => existing.slug === album.slug)) {
      throw new AdminError(409, 'That URL slug already exists. Choose a different slug.');
    }
    if (catalog.some(existing => existing.spotify_id === album.spotify_id || existing.apple_url === album.apple_url)) {
      throw new AdminError(409, 'An album with one of those music links already exists.');
    }

    const coverPath = `images/${album.slug}.${extension}`;
    const entry: Album = { ...album, rank, image: `./${coverPath}` };
    for (const [path, contents] of [[coverPath, cover], [getAlbumThumbnailPath(coverPath), thumbnail]] as const) {
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

    const updated = catalog.map(existing => existing.rank >= rank
      ? { ...existing, rank: existing.rank + 1 }
      : existing);
    updated.push(entry);
    updated.sort((a, b) => a.rank - b.rank);
    await writeFile(stagedCatalog, JSON.stringify(updated, null, 2) + '\n', { flag: 'wx' });
    await rename(stagedCatalog, catalogPath);
    committed = true;
    return entry;
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

        if (route === '/albums' && req.method === 'POST') {
          if (!authenticated) throw new AdminError(401, 'Unlock the editor to save an album.');
          const body = await readJson(req, 16 * 1024 * 1024);
          const album = await saveAlbum(server.config.root, body);
          const saved = { slug: album.slug, title: album.album };
          if (session?.token === token) session.savedAlbum = saved;
          return reply(res, 201, saved);
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

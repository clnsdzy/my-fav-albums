import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AdminError } from './upload.js';

const cookieName = '__Host-album-admin-session';
const cookieOptions = 'Path=/; Secure; HttpOnly; SameSite=Strict';
const sessionSeconds = 60 * 60;
const pinPattern = /^\d{12}$/;
let reportedConfigIssue = false;

export function adminConfig() {
  const pin = process.env.ALBUM_ADMIN_PIN?.trim();
  const githubToken = process.env.ALBUM_ADMIN_GITHUB_TOKEN?.trim();
  const production = process.env.VERCEL_ENV === 'production';
  const enabled = process.env.VITE_ALBUM_ADMIN_ENABLED === 'true';
  const pinValid = Boolean(pin && pinPattern.test(pin));
  if (production && enabled && pin && pinValid && githubToken) return { pin, githubToken };

  if (!reportedConfigIssue) {
    reportedConfigIssue = true;
    console.warn('Album editor configuration incomplete.', {
      production,
      enabled,
      pinPresent: Boolean(pin),
      pinValid,
      githubTokenPresent: Boolean(githubToken),
    });
  }
}

type AdminConfig = NonNullable<ReturnType<typeof adminConfig>>;

function sessionSignature(value: string, { githubToken, pin }: AdminConfig) {
  const key = createHmac('sha256', githubToken).update('album-admin-session-v1\0').update(pin).digest();
  return createHmac('sha256', key).update(value).digest();
}

export function isAuthenticated(request: Request, config: AdminConfig) {
  const token = request.headers.get('cookie')?.split(';')
    .map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const match = token?.match(/^(\d+)\.([0-9a-f]{32})\.([0-9a-f]{64})$/);
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  return timingSafeEqual(sessionSignature(`${match[1]}.${match[2]}`, config), Buffer.from(match[3], 'hex'));
}

export function authCookie(config?: AdminConfig) {
  const prefix = `${cookieName}=`;
  if (!config) return `${prefix}; ${cookieOptions}; Max-Age=0`;
  const value = `${Math.floor(Date.now() / 1000) + sessionSeconds}.${randomBytes(16).toString('hex')}`;
  return `${prefix}${value}.${sessionSignature(value, config).toString('hex')}; ${cookieOptions}; Max-Age=${sessionSeconds}`;
}

export function checkPin(input: unknown, config: AdminConfig) {
  if (typeof input !== 'string' || !pinPattern.test(input)) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(input), hash(config.pin));
}

export function requireSameOrigin(request: Request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || request.headers.get('origin') !== url.origin) {
    throw new AdminError(403, 'The request must come from the online editor.');
  }
}

export async function readJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    throw new AdminError(415, 'Send the form as JSON.');
  }
  if (Number(request.headers.get('content-length')) > limit) {
    throw new AdminError(413, 'The uploaded files are too large.');
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) throw new AdminError(413, 'The uploaded files are too large.');
  try {
    const body = JSON.parse(text);
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // Keep the submitted content out of the response.
  }
  throw new AdminError(400, 'The form could not be read.');
}

export function reply(status: number, body: object, cookie?: string) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
}

export function replyError(error: unknown) {
  if (error instanceof AdminError) return reply(error.status, { error: error.message });
  console.error('Album editor request failed.', error instanceof Error ? error.name : 'UnknownError');
  return reply(502, { error: 'The album editor could not complete the request. Try again.' });
}

import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

const clientId = (process.argv[2] ?? process.env.SPOTIFY_CLIENT_ID ?? '').trim();
if (!/^[a-f0-9]{32}$/i.test(clientId)) {
  console.error('Run npm run spotify:authorize -- <client-id> with the Client ID from your Spotify app.');
  process.exit(1);
}

const redirect = new URL('http://127.0.0.1:8888/spotify/callback');
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(48).toString('base64url');
const authorize = new URL('https://accounts.spotify.com/authorize');
authorize.search = new URLSearchParams({
  client_id: clientId,
  response_type: 'code',
  redirect_uri: redirect.href,
  scope: 'user-read-playback-state user-read-recently-played',
  state,
  code_challenge_method: 'S256',
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
});

let exchanging = false;
let timeout;

function finish(response, httpStatus, message) {
  response.writeHead(httpStatus, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(message);
  console.log(message);
  if (httpStatus !== 200) process.exitCode = 1;
  clearTimeout(timeout);
  server.close();
}

const server = createServer(async (request, response) => {
  const callback = new URL(request.url ?? '/', redirect);
  if (request.method !== 'GET' || callback.pathname !== redirect.pathname) return response.writeHead(404).end();
  if (callback.searchParams.get('state') !== state) {
    return response.writeHead(400).end('This callback does not match the current authorization request.');
  }

  const code = callback.searchParams.get('code');
  if (exchanging) return response.writeHead(409).end('Spotify authorization is already being processed.');
  if (!code) return finish(response, 400, 'Spotify authorization was canceled. Run the command again to reconnect.');
  exchanging = true;

  try {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirect.href,
        code,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const token = await result.json();
    if (!result.ok || typeof token.refresh_token !== 'string' || !token.refresh_token) {
      return finish(response, 400, 'Spotify could not complete authorization. Check the app redirect URI and run the command again.');
    }

    const original = existsSync(envPath) ? await readFile(envPath, 'utf8') : '';
    const otherSettings = original.replace(/^(?:export[ \t]+)?(?:SPOTIFY_CLIENT_ID|SPOTIFY_REFRESH_TOKEN)[ \t]*=.*(?:\r?\n|$)/gm, '');
    const lineBreak = otherSettings && !otherSettings.endsWith('\n') ? '\n' : '';
    const settings = `SPOTIFY_CLIENT_ID=${clientId}\nSPOTIFY_REFRESH_TOKEN=${JSON.stringify(token.refresh_token)}\n`;
    await writeFile(envPath, otherSettings + lineBreak + settings, { mode: 0o600 });
    return finish(response, 200, 'Spotify authorized. Credentials were saved to the gitignored .env.local file.');
  } catch {
    return finish(response, 500, 'Spotify authorization could not be saved. Check connectivity and .env.local permissions.');
  }
});

server.on('error', () => {
  console.error('The Spotify callback could not listen on port 8888. Free that port and run the command again.');
  process.exitCode = 1;
});

server.listen(8888, '127.0.0.1', () => {
  console.log('Open this URL in your browser to authorize listening access:');
  console.log(authorize.href);
  timeout = setTimeout(() => {
    console.error('Spotify authorization timed out. Run the command again.');
    process.exitCode = 1;
    server.close();
  }, 5 * 60 * 1000);
});

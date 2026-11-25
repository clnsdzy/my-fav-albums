import { isSpotifyCoverUrl, isSpotifyTrackUrl, type ListeningStatus, type ListeningTrack } from './status';

type SpotifyTrack = {
  type?: string;
  name?: string;
  artists?: { name?: string }[];
  external_urls?: { spotify?: string };
  album?: { images?: { url?: string }[] };
};

type Playback = {
  device?: { is_private_session?: boolean };
  is_playing?: boolean;
  item?: SpotifyTrack | null;
};

type Result = { data: ListeningStatus; httpStatus: number; expiresAt: number };
const cacheSeconds = 20;
const spotifyApi = 'https://api.spotify.com/v1/me/player';
const spotifyTokenUrl = 'https://accounts.spotify.com/api/token';

class SpotifyError extends Error {
  constructor(
    readonly reason: string,
    readonly retrySeconds = cacheSeconds,
  ) {
    super(reason);
  }
}

function toPublicTrack(track?: SpotifyTrack | null): ListeningTrack | undefined {
  if (track?.type !== 'track' || typeof track.name !== 'string' || !track.name.trim()) return;
  const artist = track.artists?.map(item => item.name).filter(Boolean).join(', ');
  const url = track.external_urls?.spotify?.split(/[?#]/)[0];
  if (!artist || !isSpotifyTrackUrl(url)) return;

  const coverUrl = track.album?.images?.map(image => image.url).filter(isSpotifyCoverUrl).at(-1);
  return { title: track.name, artist, url, coverUrl };
}

async function requestSpotify(url: string, options: RequestInit) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(4500) });
  if (response.status === 429) {
    const body = await response.json().catch(() => null);
    const quotaReached = body?.reason === 'QUOTA_EXCEEDED' || body?.error?.reason === 'QUOTA_EXCEEDED';
    const retrySeconds = Number(response.headers.get('Retry-After')) || 60;
    throw new SpotifyError(quotaReached ? 'quota_exceeded' : 'rate_limited', quotaReached ? 600 : retrySeconds);
  }
  return response;
}

export function createSpotifyStatusResponse(clientId?: string, initialRefreshToken?: string) {
  let refreshToken = initialRefreshToken?.trim();
  let accessToken: { value: string; expiresAt: number } | undefined;
  let cached: Result | undefined;
  let pending: Promise<Result> | undefined;

  async function getAccessToken() {
    if (!clientId || !refreshToken) throw new SpotifyError('reauthorization_required', 600);
    if (accessToken && accessToken.expiresAt > Date.now()) return accessToken.value;

    const response = await requestSpotify(spotifyTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId.trim(),
        refresh_token: refreshToken,
      }),
    });
    const token = await response.json().catch(() => null);
    if (token?.error === 'invalid_grant') {
      refreshToken = undefined;
      throw new SpotifyError('reauthorization_required', 600);
    }
    if (!response.ok || typeof token?.access_token !== 'string') {
      throw new SpotifyError(`token_http_${response.status}`);
    }
    if (typeof token.refresh_token === 'string' && token.refresh_token) refreshToken = token.refresh_token;
    accessToken = {
      value: token.access_token,
      expiresAt: Date.now() + Math.max(0, Number(token.expires_in) - 60) * 1000,
    };
    return accessToken.value;
  }

  async function load(): Promise<Result> {
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      const response = await requestSpotify(spotifyApi, { headers });
      if (!response.ok) {
        if (response.status === 401) accessToken = undefined;
        throw new SpotifyError(`playback_http_${response.status}`);
      }

      const playback: Playback | null = response.status === 204 ? null : await response.json();
      let data: ListeningStatus = { status: 'idle' };
      if (!playback?.device?.is_private_session) {
        const current = playback?.is_playing ? toPublicTrack(playback.item) : undefined;
        if (current) {
          data = { status: 'playing', track: current };
        } else {
          const history = await requestSpotify(`${spotifyApi}/recently-played?limit=1`, { headers });
          if (!history.ok) throw new SpotifyError(`history_http_${history.status}`);
          const recent = await history.json() as { items?: { track?: SpotifyTrack }[] };
          const track = toPublicTrack(recent.items?.[0]?.track);
          if (track) data = { status: 'last-played', track };
        }
      }

      return { data, httpStatus: 200, expiresAt: Date.now() + cacheSeconds * 1000 };
    } catch (error) {
      const reason = error instanceof SpotifyError ? error.reason : 'request_failed';
      const seconds = error instanceof SpotifyError ? error.retrySeconds : cacheSeconds;
      console.warn(`Spotify listening status unavailable (${reason}).`);
      return { data: { status: 'unavailable' }, httpStatus: 503, expiresAt: Date.now() + seconds * 1000 };
    }
  }

  return async function spotifyStatusResponse() {
    if (!clientId?.trim() || !initialRefreshToken?.trim()) {
      return Response.json({ status: 'unavailable' }, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
        status: 503,
      });
    }

    if (!cached || cached.expiresAt <= Date.now()) {
      pending ??= load().then(result => (cached = result)).finally(() => { pending = undefined; });
      cached = await pending;
    }

    const maxAge = Math.max(0, Math.floor((cached.expiresAt - Date.now()) / 1000));
    return Response.json(cached.data, {
      status: cached.httpStatus,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cached.httpStatus === 200 ? `public, max-age=0, s-maxage=${maxAge}` : 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  };
}

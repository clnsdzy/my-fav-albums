export interface ListeningTrack {
  title: string;
  artist: string;
  url: string;
  coverUrl?: string;
}

export type ListeningStatus =
  | { status: 'playing' | 'last-played'; track: ListeningTrack }
  | { status: 'idle' | 'unavailable' };

export function isSpotifyTrackUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(value);
}

export function isSpotifyCoverUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\/(?:i\.scdn\.co|image-cdn-[a-z]+\.spotifycdn\.com)\/image\/[A-Za-z0-9]+$/.test(value);
}

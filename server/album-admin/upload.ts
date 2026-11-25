import { getAlbumThumbnailPath } from '../../src/lib/album-assets.js';
import { albumSlugPattern, appleAlbumUrlPattern, spotifyIdPattern } from '../../src/lib/catalog-validation.js';
import type { Album } from '../../src/types.js';

export class AdminError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
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

function nextRank(albums: Album[]) {
  return albums.reduce((highest, album) => Math.max(highest, album.rank), 0) + 1;
}

export function prepareAlbumUpload(body: Record<string, unknown>, limits: { cover: number; thumbnail: number }) {
  const { rank: requestedRank, ...album } = parseAlbum(body);
  const cover = coverBuffer(body.cover, limits.cover, 'album cover');
  const thumbnail = coverBuffer(body.thumbnail, limits.thumbnail, 'WebP thumbnail');
  const extension = imageExtension(cover);
  if (!extension || imageExtension(thumbnail) !== 'webp') {
    throw new AdminError(400, 'Choose a JPEG, PNG, or WebP cover with a WebP thumbnail.');
  }

  const coverPath = `images/${album.slug}.${extension}`;
  return {
    album,
    requestedRank,
    coverPath,
    images: [[coverPath, cover], [getAlbumThumbnailPath(coverPath), thumbnail]] as const,
  };
}

export function updateCatalog(catalog: Album[], upload: ReturnType<typeof prepareAlbumUpload>) {
  const { album, requestedRank, coverPath } = upload;
  const appendRank = nextRank(catalog);
  const rank = requestedRank ?? appendRank;
  if (rank > appendRank) {
    throw new AdminError(400, `Rank must be from 1 to ${appendRank}.`);
  }
  if (catalog.some(existing => existing.slug === album.slug)) {
    throw new AdminError(409, 'That URL slug already exists. Choose a different slug.');
  }
  if (catalog.some(existing => existing.spotify_id === album.spotify_id || existing.apple_url === album.apple_url)) {
    throw new AdminError(409, 'An album with one of those music links already exists.');
  }

  const entry: Album = { ...album, rank, image: `./${coverPath}` };
  const updated = catalog.map(existing => existing.rank >= rank
    ? { ...existing, rank: existing.rank + 1 }
    : existing);
  updated.push(entry);
  updated.sort((a, b) => a.rank - b.rank);
  return { entry, updated };
}

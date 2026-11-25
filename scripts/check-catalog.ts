import { statSync } from 'node:fs';
import { ALBUM_CATALOG } from '../src/albums';
import { getAlbumCoverPath, getAlbumThumbnailPath } from '../src/lib/album-assets';
import { albumSlugPattern, appleAlbumUrlPattern, spotifyIdPattern } from '../src/lib/catalog-validation';

const slugs = new Set<string>();
const ranks = new Set<number>();
const legacyRanks = new Set<number>();
const spotifyIds = new Set<string>();
const appleUrls = new Set<string>();
const errors: string[] = [];

for (const album of ALBUM_CATALOG) {
  const { slug, rank, legacy_rank: legacyRank, rating, image, spotify_id: spotifyId, apple_url: appleUrl } = album;
  const name = `${album.album} by ${album.artist}`;

  if (!albumSlugPattern.test(slug) || slugs.has(slug)) {
    errors.push(`${name}: invalid or duplicate slug "${slug}"`);
  }
  slugs.add(slug);

  if (!Number.isInteger(rank) || rank < 1 || ranks.has(rank)) {
    errors.push(`${name}: invalid or duplicate rank ${rank}`);
  }
  ranks.add(rank);

  if (legacyRank !== undefined) {
    if (!Number.isInteger(legacyRank) || legacyRank < 1 || legacyRanks.has(legacyRank)) {
      errors.push(`${name}: invalid or duplicate legacy rank ${legacyRank}`);
    }
    legacyRanks.add(legacyRank);
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push(`${name}: rating must be an integer from 1 to 5`);
  }

  if (!spotifyIdPattern.test(spotifyId) || spotifyIds.has(spotifyId)) {
    errors.push(`${name}: invalid or duplicate Spotify album ID "${spotifyId}"`);
  }
  spotifyIds.add(spotifyId);

  if (!appleAlbumUrlPattern.test(appleUrl) || appleUrls.has(appleUrl)) {
    errors.push(`${name}: invalid or duplicate Apple Music album URL "${appleUrl}"`);
  }
  appleUrls.add(appleUrl);

  const cover = getAlbumCoverPath(image);
  if (!/^images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(cover)) {
    errors.push(`${name}: invalid cover path "${image}"`);
    continue;
  }

  for (const path of [cover, getAlbumThumbnailPath(image)]) {
    if (!statSync(new URL(`../public/${path}`, import.meta.url), { throwIfNoEntry: false })?.isFile()) {
      errors.push(`${name}: missing public/${path}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${ALBUM_CATALOG.length} album records.`);
}

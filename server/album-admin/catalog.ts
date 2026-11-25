import { createHash, randomBytes } from 'node:crypto';
import { albumSlugPattern } from '../../src/lib/catalog-validation.js';
import type { AlbumCatalog } from '../../src/lib/album-management.js';
import type { Album } from '../../src/types.js';
import { AdminError, parseAlbum, prepareArtwork, type ArtworkLimits } from './upload.js';

type Artwork = ReturnType<typeof prepareArtwork>;
export type CatalogChange = {
  updated: Album[];
  message: string;
  entry?: Album;
  images?: Artwork['images'];
};

function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function activeAlbums(catalog: Album[]) {
  return catalog.filter(album => !album.archived).sort((a, b) => a.rank - b.rank);
}

function orderRevision(catalog: Album[]) {
  return fingerprint(activeAlbums(catalog).map(album => album.slug));
}

export function albumRevision(album: Album) {
  return fingerprint([album.slug, album.legacy_rank, album.archived ?? false, album.album, album.artist,
    album.year, album.genre, album.rating, album.spotify_id, album.apple_url, album.summary, album.image]);
}

export function catalogView(catalog: Album[]): AlbumCatalog {
  return {
    albums: catalog.map(album => ({ ...album, revision: albumRevision(album) })),
    orderRevision: orderRevision(catalog),
  };
}

export function findAlbum(catalog: Album[], slug: unknown) {
  if (typeof slug !== 'string' || slug.length > 120 || !albumSlugPattern.test(slug)) {
    throw new AdminError(400, 'Choose a valid album.');
  }
  const album = catalog.find(item => item.slug === slug);
  if (!album) throw new AdminError(404, 'Album not found.');
  return album;
}

function checkRevision(album: Album, revision: unknown) {
  if (albumRevision(album) !== revision) {
    throw new AdminError(409, 'This album changed since you opened it. Reload its latest version before saving.');
  }
}

function checkDuplicates(catalog: Album[], album: { slug: string; spotify_id: string; apple_url: string }) {
  if (catalog.some(item => item.slug !== album.slug && (item.spotify_id === album.spotify_id || item.apple_url === album.apple_url))) {
    throw new AdminError(409, 'An album with one of those music links already exists.');
  }
}

function withRanks(active: Album[], catalog: Album[]) {
  return [...active, ...catalog.filter(album => album.archived).sort((a, b) => a.rank - b.rank)]
    .map((album, index) => ({ ...album, rank: index + 1 }));
}

export function replacementName(slug: string) {
  return `${slug}-${randomBytes(8).toString('hex')}`;
}

export function restoreVersion(catalog: Album[], body: Record<string, unknown>, previous: Album, coverPath: string): CatalogChange {
  const current = findAlbum(catalog, body.slug);
  checkRevision(current, body.revision);
  const entry: Album = {
    ...previous, slug: current.slug, rank: current.rank, archived: current.archived,
    legacy_rank: current.legacy_rank, image: `./${coverPath}`,
  };
  checkDuplicates(catalog, entry);
  return {
    updated: catalog.map(album => album.slug === current.slug ? entry : album),
    message: `Restore version: ${entry.album}`,
    entry,
  };
}

export function prepareCatalogChange(body: Record<string, unknown>, limits: ArtworkLimits) {
  switch (body.action) {
    case undefined:
    case 'create': {
      const { rank, ...fields } = parseAlbum(body);
      const artwork = prepareArtwork(body, limits, fields.slug);
      return (catalog: Album[]): CatalogChange => {
        const active = activeAlbums(catalog);
        const position = rank ?? active.length + 1;
        if (position > active.length + 1) throw new AdminError(400, `Rank must be from 1 to ${active.length + 1}.`);
        if (catalog.some(album => album.slug === fields.slug)) {
          throw new AdminError(409, 'That URL slug already exists. Choose a different slug.');
        }
        checkDuplicates(catalog, fields);
        const entry = { ...fields, rank: position, image: `./${artwork.coverPath}` };
        active.splice(position - 1, 0, entry);
        return { updated: withRanks(active, catalog), message: `Add album: ${entry.album}`, entry, images: artwork.images };
      };
    }
    case 'edit': {
      if (typeof body.slug !== 'string' || !albumSlugPattern.test(body.slug)) throw new AdminError(400, 'Choose a valid album.');
      const { rank: _rank, ...fields } = parseAlbum({ ...body, rank: undefined });
      const artwork = body.cover !== undefined || body.thumbnail !== undefined
        ? prepareArtwork(body, limits, replacementName(fields.slug))
        : undefined;
      return (catalog: Album[]): CatalogChange => {
        const current = findAlbum(catalog, fields.slug);
        checkRevision(current, body.revision);
        checkDuplicates(catalog, fields);
        const entry = { ...current, ...fields, image: artwork ? `./${artwork.coverPath}` : current.image };
        if (albumRevision(entry) === albumRevision(current)) throw new AdminError(400, 'Change an album field before saving.');
        return {
          updated: catalog.map(album => album.slug === current.slug ? entry : album),
          message: `Edit album: ${entry.album}`,
          entry,
          images: artwork?.images,
        };
      };
    }
    case 'archive':
    case 'restore': {
      const archived = body.action === 'archive';
      return (catalog: Album[]): CatalogChange => {
        const current = findAlbum(catalog, body.slug);
        checkRevision(current, body.revision);
        if (Boolean(current.archived) === archived) throw new AdminError(409, 'The album is already in that collection.');
        const otherAlbums = catalog.filter(album => album.slug !== current.slug);
        const entry = { ...current, archived: archived || undefined };
        const updated = withRanks(
          archived ? activeAlbums(otherAlbums) : [...activeAlbums(otherAlbums), entry],
          archived ? [...otherAlbums, entry] : otherAlbums,
        );
        return { updated, message: `${archived ? 'Archive' : 'Restore'} album: ${current.album}`, entry };
      };
    }
    case 'reorder': {
      if (!Array.isArray(body.order) || body.order.some(slug => typeof slug !== 'string')) {
        throw new AdminError(400, 'Provide the complete album order.');
      }
      const order: string[] = body.order;
      return (catalog: Album[]): CatalogChange => {
        if (orderRevision(catalog) !== body.revision) {
          throw new AdminError(409, 'The collection order changed. Reload it before reordering.');
        }
        const active = activeAlbums(catalog);
        const bySlug = new Map(active.map(album => [album.slug, album]));
        if (order.length !== active.length || new Set(order).size !== active.length || order.some(slug => !bySlug.has(slug))) {
          throw new AdminError(400, 'Include every active album exactly once.');
        }
        if (order.every((slug, index) => slug === active[index].slug)) throw new AdminError(400, 'Move an album before saving the order.');
        return { updated: withRanks(order.map(slug => bySlug.get(slug)!), catalog), message: 'Reorder the album collection' };
      };
    }
    default:
      throw new AdminError(400, 'Choose a valid album action.');
  }
}

export function receipt(change: CatalogChange, commit?: string) {
  return { message: change.message, slug: change.entry?.slug, title: change.entry?.album, commit };
}

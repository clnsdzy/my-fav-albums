import catalog from './album-catalog.json';
import type { Album } from './types';

export const ALBUM_CATALOG: Album[] = catalog;
export const MY_ALBUMS = ALBUM_CATALOG.filter(album => !album.archived);

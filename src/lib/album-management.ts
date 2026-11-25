import type { Album } from '../types.js';

export type ManagedAlbum = Album & { revision: string };

export interface AlbumCatalog {
  albums: ManagedAlbum[];
  orderRevision: string;
}

export interface AlbumReceipt {
  message: string;
  slug?: string;
  title?: string;
  commit?: string;
}

export interface AlbumVersion {
  commit: string;
  date: string;
  message: string;
  album: Album;
  current: boolean;
}

export interface DeploymentStatus {
  state: 'pending' | 'success' | 'failure';
  url?: string;
}

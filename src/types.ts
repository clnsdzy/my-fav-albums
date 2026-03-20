export interface Album {
  year: number;
  rank: number;
  artist: string;
  album: string;
  rating: number; // 1-5
  image: string;
  summary: string;
  listeners: string;
  playcount: string;
  url: string;
}

export interface AlbumCache {
  [key: string]: Album | null;
}

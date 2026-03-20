export interface Album {
  year: number;
  rank: number;
  artist: string;
  album: string;
  rating: number; // 1-5
  image: string;
  summary: string;
  spotify_url: string;
  apple_url: string;
  spotify_id?: string;
}

export interface AlbumCache {
  [key: string]: Album | null;
}

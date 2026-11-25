export interface Album {
  slug: string;
  legacy_rank?: number;
  archived?: boolean;
  year: number;
  rank: number;
  artist: string;
  album: string;
  rating: number; // 1-5
  image: string;
  summary: string;
  apple_url: string;
  spotify_id: string;
  genre: string;
}

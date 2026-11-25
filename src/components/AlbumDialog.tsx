import { Disc, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { getAlbumCoverPath, getSpotifyAlbumUrl } from '../lib/album-assets';
import { Album } from '../types';
import { DialogContent, DialogDescription, DialogTitle } from './Dialog';

export default function AlbumDialog({ album }: { album: Album }) {
  return (
    <DialogContent>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col md:flex-row">
          <div className="bg-surface md:w-2/5 md:shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}${getAlbumCoverPath(album.image)}`}
              alt={`${album.album} cover`}
              className="h-auto max-h-[35dvh] w-full object-contain md:h-full md:max-h-none md:object-cover"
            />
          </div>

          <div className="flex flex-col gap-4 p-6 md:w-3/5 md:p-10">
            <div className="md:pr-10">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-widest text-accent uppercase">
                Rank #{album.rank} • {album.year}
              </span>
              <DialogTitle className="mt-2 mb-1 font-serif text-3xl font-bold text-text-primary md:text-4xl">{album.album}</DialogTitle>
              <DialogDescription className="text-xl font-medium text-accent">{album.artist}</DialogDescription>
            </div>
            <div>
              <p className="mb-1 text-[10px] tracking-wider text-text-muted uppercase">About the Album</p>
              <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-text-muted">
                <ReactMarkdown>{album.summary}</ReactMarkdown>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Link
                to={`/album/${album.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold text-[#212529] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Learn More
                <Eye className="h-4 w-4" />
              </Link>
              <a
                href={getSpotifyAlbumUrl(album.spotify_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1DB954] px-6 py-3 text-sm font-bold text-[#212529] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Spotify
                <Disc className="h-4 w-4" />
              </a>
              <a
                href={album.apple_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#CC1730] px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Apple Music
                <Disc className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

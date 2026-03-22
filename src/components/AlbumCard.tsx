import { motion } from 'motion/react';
import { Disc, Info, ExternalLink, Eye } from 'lucide-react';
import { Album } from '../types';
import { Rating } from './Rating';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from './Dialog';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const navigate = useNavigate();
  const imageUrl = album.image;
  const summary = album.summary;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group relative cursor-pointer overflow-hidden rounded-md bg-surface shadow-lg transition-colors duration-300"
        >
          {/* Album Art */}
          <div className="aspect-square w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={`${album.album} by ${album.artist}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Rank Badge */}
          <div className="absolute left-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-accent font-serif text-sm font-bold text-bg shadow-lg">
            {album.rank}
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 z-10 flex translate-y-full flex-col justify-end bg-overlay p-4 transition-transform duration-300 group-hover:translate-y-0">
            <h3 className="line-clamp-1 font-serif text-lg font-bold leading-tight text-text-primary">
              {album.album}
            </h3>
            <p className="mb-2 text-xs text-accent/90">{album.artist}</p>
            <Rating rating={album.rating} className="mb-2" />
            <div className="line-clamp-2 text-[10px] leading-relaxed text-text-muted">
              <ReactMarkdown>{summary.split('<a')[0]}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      </DialogTrigger>

      <DialogContent className="max-w-4xl bg-bg border-border-main transition-colors duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Left: Art */}
          <div className="w-full md:w-[40%]">
            <img
              src={imageUrl}
              alt={album.album}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right: Details */}
          <div className="flex flex-col p-6 md:w-[60%] md:p-10">
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-widest text-accent uppercase">
                  Rank #{album.rank} • {album.year}
                </span>
              </div>
              <DialogTitle className="font-serif text-4xl font-bold text-text-primary mb-1">{album.album}</DialogTitle>
              <DialogDescription className="text-xl text-accent font-medium">{album.artist}</DialogDescription>
            </div>

            <div className="mb-8 flex items-center gap-6 border-y border-border-main py-4 transition-colors duration-300">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Rating</p>
                <Rating rating={album.rating} />
              </div>
            </div>

            <div className="mb-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">About the Album</p>
              <div className="prose prose-invert prose-sm max-w-none text-text-muted leading-relaxed mb-6 transition-colors duration-300">
                <ReactMarkdown>{summary.split('<a')[0]}</ReactMarkdown>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <button
                onClick={() => navigate(`/album/${album.rank}`)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold text-bg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Learn More
                <Eye className="h-4 w-4" />
              </button>
              <a
                href={album.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1DB954] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#1DB954]/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Spotify
                <Disc className="h-4 w-4" />
              </a>
              <a
                href={album.apple_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FA243C] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#FA243C]/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Apple Music
                <Disc className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

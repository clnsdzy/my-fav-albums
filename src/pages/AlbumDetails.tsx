import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Disc, ExternalLink, Star, Calendar, Hash, Music } from 'lucide-react';
import { MY_ALBUMS } from '../albums';
import { Rating } from '../components/Rating';
import ReactMarkdown from 'react-markdown';
import { useEffect } from 'react';

export default function AlbumDetails() {
  const { rank } = useParams<{ rank: string }>();
  const navigate = useNavigate();
  
  const album = MY_ALBUMS.find(a => a.rank === parseInt(rank || '0'));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!album) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
        <Disc className="mb-6 h-20 w-20 animate-spin-slow text-accent opacity-20" />
        <h1 className="mb-4 font-serif text-4xl font-bold text-text-primary">Album Not Found</h1>
        <p className="mb-8 text-text-muted">The record you're looking for isn't in the collection.</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-bold text-bg transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Collection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b border-border-main bg-bg/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link 
            to="/" 
            className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Disc className="h-5 w-5 text-accent animate-spin-slow" />
            <span className="font-serif font-bold italic text-text-primary">My Top Albums</span>
          </div>
          <div className="w-20" /> {/* Spacer for balance */}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: Visuals */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="">
              <div className="relative aspect-square overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border-main">
                <img
                  src={album.image}
                  alt={album.album}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-8 left-8 right-8">
                   <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-bg shadow-xl">
                        #{album.rank}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">Position in Top 100</p>
                        <p className="font-serif text-xl font-bold text-white italic">The Collection</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
              <a
                href={album.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 rounded-xl bg-[#1DB954] px-8 py-4 font-bold text-white transition-all hover:bg-[#1DB954]/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#1DB954]/20"
              >
                Open in Spotify
                <ExternalLink className="h-5 w-5" />
              </a>
              <a
                href={album.apple_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 rounded-xl bg-[#FA243C] px-8 py-4 font-bold text-white transition-all hover:bg-[#FA243C]/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#FA243C]/20"
              >
                Apple Music
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="mb-10">
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-[10px] font-bold tracking-widest text-accent uppercase ring-1 ring-accent/20">
                  <Music className="h-3 w-3" /> {album.genre}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-1.5 text-[10px] font-bold tracking-widest text-text-muted uppercase ring-1 ring-border-main transition-colors duration-300">
                  <Calendar className="h-3 w-3" /> {album.year}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-1.5 text-[10px] font-bold tracking-widest text-text-muted uppercase ring-1 ring-border-main transition-colors duration-300">
                  <Hash className="h-3 w-3" /> Rank {album.rank}
                </span>
              </div>
              
              <h1 className="mb-2 font-serif text-5xl font-bold tracking-tight text-text-primary md:text-7xl lg:text-8xl transition-colors duration-300">
                {album.album}
              </h1>
              <p className="font-serif text-3xl font-medium text-accent italic md:text-4xl">
                {album.artist}
              </p>
            </div>

            <div className="mb-12 grid grid-cols-2 gap-8 border-y border-border-main py-8 transition-colors duration-300">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Personal Rating</p>
                <div className="flex items-center gap-3">
                  <Rating rating={album.rating} size={24} />
                  {/* <span className="text-lg font-bold text-text-primary">{album.rating}/5</span> */}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Listen On</p>
                <div className="flex gap-4">
                  <a href={album.spotify_url} target="_blank" rel="noopener noreferrer" className="text-text-muted transition-colors hover:text-[#1DB954]">
                    <Disc className="h-6 w-6" />
                  </a>
                  <a href={album.apple_url} target="_blank" rel="noopener noreferrer" className="text-text-muted transition-colors hover:text-[#FA243C]">
                    <Music className="h-6 w-6" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">The Story</h2>
              <div className="prose prose-invert prose-lg max-w-none text-text-muted leading-relaxed transition-colors duration-300">
                <ReactMarkdown>{album.summary}</ReactMarkdown>
              </div>
            </div>
              {album.spotify_id && (
                <div className="mt-8 overflow-hidden rounded-2xl bg-surface p-1 shadow-lg ring-1 ring-border-main transition-colors duration-300">
                  <iframe
                    style={{ borderRadius: '12px' }}
                    src={`https://open.spotify.com/embed/album/${album.spotify_id}?utm_source=generator&theme=0`}
                    width="100%"
                    height="600"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="w-full"
                  />
                </div>
              )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

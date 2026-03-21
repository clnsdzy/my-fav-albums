import { motion, AnimatePresence } from 'motion/react';
import { Disc } from 'lucide-react';
import { Hero } from './components/Hero';
import { AlbumCard } from './components/AlbumCard';
import { MY_ALBUMS } from './albums';

export default function App() {
  const sortedAlbums = [...MY_ALBUMS].sort((a, b) => a.rank - b.rank);

  return (
    <div className="min-h-screen bg-bg">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Disc className="h-6 w-6 text-accent" />
            <span className="font-serif text-xl font-bold tracking-tight text-white">
              My Top <span className="text-accent">Albums</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              All-Time Favorites
            </span>
          </div>
        </div>
      </header>

      <main>
        <Hero />

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 flex items-end justify-between border-b border-zinc-800 pb-6">
            <div>
              <h2 className="font-serif text-3xl font-bold text-white md:text-5xl">
                All-Time <span className="text-accent italic">Favorites</span>
              </h2>
              <div className="mt-4 h-1 w-24 bg-accent"></div>
            </div>
            <p className="hidden text-sm text-zinc-500 md:block">
              Showing {sortedAlbums.length} records
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {sortedAlbums.map((album) => (
                <motion.div
                  key={`${album.year}-${album.rank}-${album.album}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlbumCard
                    album={album}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 px-6 py-12 text-center">
        <div className="mx-auto max-w-7xl">
          <Disc className="mx-auto mb-4 h-8 w-8 text-zinc-800" />
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-600">
            Curated by Collins • My All-Time Favorites
          </p>
          <p className="mt-4 text-[10px] text-zinc-700">
            © 2026 My Top Albums. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

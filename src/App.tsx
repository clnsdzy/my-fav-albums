import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disc, Filter, SortAsc, Star } from 'lucide-react';
import { AlbumCard } from './components/AlbumCard';
import { MY_ALBUMS } from './albums';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/Select';

export default function App() {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('rank');

  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(MY_ALBUMS.map(a => a.year))).sort((a, b) => b - a);
    return ['All', ...uniqueYears.map(String)];
  }, []);

  const genres = useMemo(() => {
    const uniqueGenres = Array.from(new Set(MY_ALBUMS.map(a => a.genre))).sort();
    return ['All', ...uniqueGenres];
  }, []);

  const filteredAndSortedAlbums = useMemo(() => {
    let result = [...MY_ALBUMS];

    if (selectedYear !== 'All') {
      result = result.filter(a => a.year === parseInt(selectedYear));
    }

    if (selectedRating !== 'All') {
      result = result.filter(a => a.rating === parseInt(selectedRating));
    }

    if (selectedGenre !== 'All') {
      result = result.filter(a => a.genre === selectedGenre);
    }

    result.sort((a, b) => {
      if (sortBy === 'rank') return a.rank - b.rank;
      if (sortBy === 'year') return b.year - a.year;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'album') return a.album.localeCompare(b.album);
      return 0;
    });

    return result;
  }, [selectedYear, selectedRating, selectedGenre, sortBy]);

  return (
    <div className="min-h-screen bg-bg text-zinc-100">
      <main className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Disc className="h-8 w-8 text-accent animate-spin-slow" />
            <h1 className="font-serif text-4xl font-bold tracking-tight text-white md:text-6xl">
              My Top <span className="text-accent italic">Albums</span>
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-zinc-400 font-sans">
            A curated collection of my all-time favorite records. Filter by genre, year, or rating to explore the soundscape.
          </p>
        </div>

        {/* Filters Section */}
        <div className="mb-12 grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 md:grid-cols-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Filter className="h-3 w-3" /> Genre
            </label>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-white">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Filter className="h-3 w-3" /> Year
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-white">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Star className="h-3 w-3" /> Rating
            </label>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-white">
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <SortAsc className="h-3 w-3" /> Sort By
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full border-zinc-800 bg-zinc-900 text-white">
                <SelectValue placeholder="Rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="album">Album Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
          <h2 className="font-serif text-2xl font-bold text-white">
            The <span className="text-accent italic">Collection</span>
          </h2>
          <p className="text-sm text-zinc-500">
            Showing {filteredAndSortedAlbums.length} records
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedAlbums.map((album) => (
              <motion.div
                key={`${album.year}-${album.rank}-${album.album}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <AlbumCard album={album} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredAndSortedAlbums.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 text-zinc-500">
            <Disc className="mb-4 h-12 w-12 opacity-20" />
            <p className="font-sans">No albums match your filters.</p>
            <button 
              onClick={() => {
                setSelectedGenre('All');
                setSelectedYear('All');
                setSelectedRating('All');
              }}
              className="mt-4 text-xs font-bold uppercase tracking-widest text-accent hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/50 px-6 py-12 text-center">
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

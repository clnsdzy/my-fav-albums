import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disc, Filter, SortAsc, Star } from 'lucide-react';
import { AlbumCard } from './components/AlbumCard';
import { MY_ALBUMS } from './albums';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/Select';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('rank');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

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
    <div className="min-h-screen bg-bg text-text-primary transition-colors duration-300">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      
      <main className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Disc className="h-8 w-8 text-accent animate-spin-slow" />
            <h1 className="font-serif text-4xl font-bold tracking-tight text-text-primary md:text-6xl transition-colors duration-300">
              My Top <span className="text-accent italic">Albums</span>
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-text-muted font-sans transition-colors duration-300">
            A curated collection of my all-time favorite records. Filter by genre, year, or rating to explore the soundscape.
          </p>
        </div>

        {/* Filters Section */}
        <div className="mb-12 grid grid-cols-1 gap-4 rounded-xl border border-border-main bg-surface p-6 md:grid-cols-4 transition-all duration-300">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Filter className="h-3 w-3" /> Genre
            </label>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-full border-border-main bg-bg text-text-primary transition-colors duration-300">
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
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Filter className="h-3 w-3" /> Year
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full border-border-main bg-bg text-text-primary transition-colors duration-300">
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
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Star className="h-3 w-3" /> Rating
            </label>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger className="w-full border-border-main bg-bg text-text-primary transition-colors duration-300">
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
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <SortAsc className="h-3 w-3" /> Sort By
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full border-border-main bg-bg text-text-primary transition-colors duration-300">
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

        <div className="mb-8 flex items-center justify-between border-b border-border-main pb-4 transition-colors duration-300">
          <h2 className="font-serif text-2xl font-bold text-text-primary transition-colors duration-300">
            The <span className="text-accent italic">Collection</span>
          </h2>
          <p className="text-sm text-text-muted transition-colors duration-300">
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
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border-main text-text-muted transition-colors duration-300">
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

      <footer className="border-t border-border-main bg-surface px-6 py-12 text-center transition-colors duration-300">
        <div className="mx-auto max-w-7xl">
          <Disc className="mx-auto mb-4 h-8 w-8 text-border-main" />
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted">
            Curated by Collins • My All-Time Favorites
          </p>
          <p className="mt-4 text-[10px] text-text-muted opacity-50">
            © 2026 My Top Albums. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

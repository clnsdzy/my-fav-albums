import { motion } from 'motion/react';
import { Disc } from 'lucide-react';

export function Hero() {
  return (
    <section className="grain-overlay relative flex min-h-[60vh] w-full items-center overflow-hidden bg-bg px-6 py-20 md:px-12 lg:px-24">
      <div className="relative z-20 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-glow mb-4 font-serif text-6xl font-bold leading-tight text-white md:text-8xl">
            My Top <span className="text-accent italic">Albums</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            A personal record of the albums that defined each year. A journey through sound, curated with an audiophile's heart.
          </p>
          
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px w-12 bg-accent"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Est. 2020</span>
          </div>
        </motion.div>
      </div>

      {/* Vinyl Record Graphic */}
      <motion.div
        initial={{ opacity: 0, x: 100, rotate: -45 }}
        animate={{ opacity: 0.15, x: 0, rotate: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -right-20 top-1/2 -translate-y-1/2 hidden lg:block"
      >
        <div className="relative h-[600px] w-[600px]">
          <Disc className="h-full w-full animate-spin-slow text-white" strokeWidth={0.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full border-4 border-accent/30 bg-bg"></div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

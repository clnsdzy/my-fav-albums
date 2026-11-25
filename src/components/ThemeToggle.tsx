import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  placement?: 'floating' | 'inline';
}

export function ThemeToggle({ theme, toggleTheme, placement = 'floating' }: ThemeToggleProps) {
  const position = placement === 'inline'
    ? 'size-11'
    : 'fixed bottom-8 right-8 z-50 size-12 shadow-lg backdrop-blur-md';

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`${position} inline-flex items-center justify-center rounded-full border border-border-main bg-surface text-accent-text transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text`}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun aria-hidden="true" className="size-5" />
      ) : (
        <Moon aria-hidden="true" className="size-5" />
      )}
    </motion.button>
  );
}

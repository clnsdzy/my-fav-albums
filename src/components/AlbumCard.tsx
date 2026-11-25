import * as Dialog from '@radix-ui/react-dialog';
import { lazy, Suspense, useState } from 'react';
import { Album } from '../types';
import { getAlbumThumbnailPath } from '../lib/album-assets';

const AlbumDialog = lazy(() => import('./AlbumDialog'));

interface AlbumCardProps {
  album: Album;
  prioritizeCover: boolean;
}

export function AlbumCard({ album, prioritizeCover }: AlbumCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={`${album.album} by ${album.artist}`}
          className="group relative block w-full cursor-pointer overflow-hidden rounded-md bg-surface text-left shadow-lg transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span className="block aspect-square w-full overflow-hidden">
            <img
              src={`${import.meta.env.BASE_URL}${getAlbumThumbnailPath(album.image)}`}
              alt=""
              loading={prioritizeCover ? 'eager' : 'lazy'}
              fetchPriority={prioritizeCover ? 'high' : undefined}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </span>

          <span className="absolute inset-0 z-10 flex translate-y-full flex-col justify-end bg-overlay p-4 transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
            <span className="line-clamp-1 font-serif text-lg font-bold leading-tight text-text-primary">
              {album.album}
            </span>
            <span className="text-xs text-accent/90">{album.artist}</span>
            <span className="mb-2 text-xs">{album.year}</span>
            <span className="line-clamp-2 text-[10px] leading-relaxed text-text-muted">
              {album.summary}
            </span>
          </span>
        </button>
      </Dialog.Trigger>

      {open && (
        <Suspense fallback={<span role="status" className="sr-only">Loading album preview…</span>}>
          <AlbumDialog album={album} />
        </Suspense>
      )}
    </Dialog.Root>
  );
}

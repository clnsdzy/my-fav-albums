import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Disc } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MY_ALBUMS } from '../albums';
import { Rating } from '../components/Rating';
import { getAlbumCoverPath, getSpotifyAlbumUrl } from '../lib/album-assets';

const listenLinkClass = 'flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text';

export default function AlbumDetails({ themeToggle }: { themeToggle: ReactNode }) {
  const { albumId } = useParams();
  const album = MY_ALBUMS.find(item => item.slug === albumId);
  const legacyAlbum = albumId && /^\d+$/.test(albumId)
    ? MY_ALBUMS.find(item => item.legacy_rank === Number(albumId))
    : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [albumId]);

  if (legacyAlbum) {
    return <Navigate to={`/album/${legacyAlbum.slug}`} replace />;
  }

  return (
    <>
      <nav aria-label="Album navigation" className="sticky top-0 z-40 border-b border-border-main bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto grid min-h-15 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 sm:px-8">
          <Link
            to="/"
            aria-label="Back to collection"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded text-sm font-medium text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text"
          >
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" /> Collection
          </Link>
          <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Disc aria-hidden="true" className="hidden size-4 text-accent-text sm:block" /> My Top Albums
          </span>
          <div className="justify-self-end">{themeToggle}</div>
        </div>
      </nav>

      {album ? (
        <main className="mx-auto w-full max-w-xl px-5 pt-7 pb-12 sm:px-8 sm:pt-10 lg:max-w-6xl lg:pt-14 lg:pb-16">
          <div className="grid min-w-0 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-0 xl:gap-x-16">
            <header className="min-w-0 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-medium text-text-muted">
                <span className="rounded-md bg-accent/10 px-2.5 py-1 text-accent-text [overflow-wrap:anywhere]">{album.genre}</span>
                <span>{album.year}</span>
                <span aria-hidden="true">·</span>
                <span>Rank {album.rank}</span>
              </div>
              <h1 className="mt-3 text-4xl leading-[1.05] font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
                {album.album}
              </h1>
              <p className="mt-2 text-xl font-medium text-accent-text [overflow-wrap:anywhere] sm:text-2xl">{album.artist}</p>
              <div className="mt-4 flex items-center gap-2.5">
                <Rating rating={album.rating} size={16} />
                <span aria-hidden="true" className="text-sm font-medium text-text-muted">{album.rating}/5</span>
              </div>
            </header>

            <div className="mx-auto aspect-square w-full max-w-lg self-start overflow-hidden rounded-2xl border border-border-main bg-surface lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <img
                src={`${import.meta.env.BASE_URL}${getAlbumCoverPath(album.image)}`}
                alt={`${album.album} album cover`}
                className="block h-full w-full object-cover"
                fetchPriority="high"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:pt-6">
              <div className="grid max-w-lg grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
                <a
                  href={getSpotifyAlbumUrl(album.spotify_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Spotify"
                  className={`${listenLinkClass} border-transparent bg-text-primary text-bg hover:opacity-85`}
                >
                  Spotify <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                </a>
                <a
                  href={album.apple_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Apple Music"
                  className={`${listenLinkClass} border-border-main bg-surface text-text-primary hover:border-accent`}
                >
                  Apple Music <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                </a>
              </div>

              <section aria-labelledby="album-summary" className="mt-6 border-t border-border-main pt-5">
                <h2 id="album-summary" className="mb-2 text-lg font-semibold tracking-tight">About the album</h2>
                <div className="max-w-prose space-y-3 text-base/7 text-text-muted [overflow-wrap:anywhere] [&_a]:text-accent-text [&_a]:underline">
                  <ReactMarkdown>{album.summary}</ReactMarkdown>
                </div>
              </section>
            </div>
          </div>

          {album.spotify_id && (
            <section aria-labelledby="album-preview" className="mt-9 border-t border-border-main pt-6 lg:mt-11">
              <h2 id="album-preview" className="mb-3 text-xl font-semibold tracking-tight">Spotify preview</h2>
              <iframe
                title={`${album.album} on Spotify`}
                src={`https://open.spotify.com/embed/album/${album.spotify_id}?utm_source=generator&theme=0`}
                width="100%"
                height={152}
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block w-full rounded-xl bg-surface ring-1 ring-border-main"
              />
            </section>
          )}
        </main>
      ) : (
        <main className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-5 py-14 text-center">
          <Disc aria-hidden="true" className="mb-4 size-12 text-accent-text" />
          <h1 className="text-3xl font-bold tracking-tight">Album not found</h1>
          <p className="mt-2 text-text-muted">This album is missing from the collection.</p>
        </main>
      )}
    </>
  );
}

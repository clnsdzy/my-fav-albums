import { useEffect, useState } from 'react';
import { request } from '../lib/album-admin-api';
import { getAlbumThumbnailPath } from '../lib/album-assets';
import type { AlbumVersion, ManagedAlbum } from '../lib/album-management';
import { secondaryClass } from './album-admin-styles';

const github = 'https://github.com/clnsdzy/my-fav-albums';
const raw = 'https://raw.githubusercontent.com/clnsdzy/my-fav-albums';
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function AlbumVersionHistory({ album, busy, onBack, onRestore }: {
  album: ManagedAlbum;
  busy: boolean;
  onBack: () => void;
  onRestore: (commit: string) => void;
}) {
  const [versions, setVersions] = useState<AlbumVersion[]>([]);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void request<{ versions: AlbumVersion[]; hasMore: boolean }>(
      `albums?history=${encodeURIComponent(album.slug)}&page=${page}`, { signal: controller.signal },
    ).then(result => {
      if (controller.signal.aborted) return;
      setVersions(previous => [...previous, ...result.versions.filter(version => !previous.some(item => item.commit === version.commit))]);
      setMore(result.hasMore);
      setLoadedPage(page);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The album history could not be loaded.');
    });
    return () => controller.abort();
  }, [album.slug, page, attempt]);

  return (
    <section className="rounded-2xl border border-border-main bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-bold">Revision history</h2>
          <p className="mt-1 text-sm text-text-muted">{album.album} · {album.artist}</p>
        </div>
        <button type="button" className={secondaryClass} disabled={busy} onClick={onBack}>Back to albums</button>
      </div>
      {error && <div className="p-4">
        <p role="alert" className="mb-3">{error}</p>
        <button type="button" className={secondaryClass} onClick={() => { setError(''); setAttempt(count => count + 1); }}>Retry loading history</button>
      </div>}
      {versions.length > 0 && <ul className="divide-y divide-border-main">
        {versions.map(version => (
          <li key={version.commit} className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
            <img src={`${raw}/${version.commit}/public/${getAlbumThumbnailPath(version.album.image)}`}
              alt="" width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-lg bg-bg object-cover" />
            <div className="min-w-44 flex-1">
              <p className="font-semibold">{version.album.album}</p>
              <p className="text-sm text-text-muted">{version.album.artist} · {version.album.year} · {version.album.genre} · {version.album.rating}/5</p>
              <p className="mt-1 text-sm text-text-muted"><time dateTime={version.date}>{dateFormat.format(new Date(version.date))}</time> · {version.message}</p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-text-muted">Summary</summary>
                <p className="mt-2 whitespace-pre-wrap break-words">{version.album.summary}</p>
              </details>
            </div>
            <div className="flex items-center gap-3">
              <a href={`${github}/commit/${version.commit}`} className="text-sm underline underline-offset-4" target="_blank" rel="noreferrer">View commit</a>
              {version.current ? <span className="text-sm text-text-muted">Current</span> :
                <button type="button" className={secondaryClass} disabled={busy} onClick={() => onRestore(version.commit)}>Restore version</button>}
            </div>
          </li>
        ))}
      </ul>}
      {!error && loadedPage < page && <p role="status" className="p-4 text-sm text-text-muted">Loading history…</p>}
      {!error && loadedPage === page && versions.length === 0 && !more && <p className="p-4 text-text-muted">No versions found.</p>}
      {!error && loadedPage === page && more && <div className="p-4">
        <button type="button" className={secondaryClass} disabled={busy} onClick={() => setPage(value => value + 1)}>Load older revisions</button>
      </div>}
    </section>
  );
}

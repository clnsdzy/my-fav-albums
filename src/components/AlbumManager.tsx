import { useEffect, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, GripVertical, History, Pencil, Plus, RotateCcw, Search, ListOrdered } from 'lucide-react';
import { request } from '../lib/album-admin-api';
import { getAlbumThumbnailPath } from '../lib/album-assets';
import type { AlbumCatalog, AlbumReceipt, DeploymentStatus, ManagedAlbum } from '../lib/album-management';
import AlbumEditorForm from './AlbumEditorForm';
import AlbumVersionHistory from './AlbumVersionHistory';
import { inputClass, secondaryClass, submitClass } from './album-admin-styles';

const online = import.meta.env.PROD;
const base = String(import.meta.env.BASE_URL);
const repository = 'https://github.com/clnsdzy/my-fav-albums';

type View =
  | { kind: 'list' | 'create' | 'order' }
  | { kind: 'edit' | 'history'; album: ManagedAlbum };

function Cover({ album }: { album: ManagedAlbum }) {
  return <img src={base + getAlbumThumbnailPath(album.image)} alt="" width={48} height={48} loading="lazy"
    className="size-12 shrink-0 rounded-lg bg-bg object-cover" />;
}

function PublishNotice({ receipt, active }: { receipt: AlbumReceipt; active: boolean }) {
  const [status, setStatus] = useState<DeploymentStatus>();
  const [paused, setPaused] = useState(false);
  const [check, setCheck] = useState(0);
  const { commit, slug } = receipt;

  useEffect(() => {
    if (!commit) return;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    let attempts = 0;

    async function poll() {
      try {
        const state = await request<DeploymentStatus>(`albums?deployment=${commit}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setStatus(state);
        if (state.state !== 'pending') return;
        if (++attempts < 12) timeout = setTimeout(poll, 10000);
        else setPaused(true);
      } catch {
        if (!controller.signal.aborted) setPaused(true);
      }
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [commit, check]);

  const label = status?.state === 'success' ? 'Deployed'
    : status?.state === 'failure' ? 'Deployment failed'
    : paused ? 'Check deployment status' : 'Committed · waiting for Vercel';

  return (
    <aside className="mb-5 rounded-xl border border-border-main bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="status">
          <p className="font-semibold">{receipt.message}</p>
          {!!commit && <p className="mt-1 text-sm text-text-muted">{label}</p>}
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          {commit && <a href={`${repository}/commit/${commit}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">View commit</a>}
          {status?.url && <a href={status.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">View deployment</a>}
          {paused && status?.state !== 'success' && status?.state !== 'failure' && (
            <button type="button" className="underline underline-offset-4" onClick={() => { setPaused(false); setCheck(count => count + 1); }}>Check again</button>
          )}
          {slug && active && (!commit || status?.state === 'success') && (
            <a href={`${base}${commit ? 'album/' : '#/album/'}${slug}`} className="underline underline-offset-4">Open album</a>
          )}
        </div>
      </div>
    </aside>
  );
}

function AlbumOrder({ albums, disabled, onCancel, onSave }: {
  albums: ManagedAlbum[];
  disabled: boolean;
  onCancel: () => void;
  onSave: (order: string[]) => void;
}) {
  const [ordered, setOrdered] = useState(albums);
  const [dragging, setDragging] = useState<string>();
  const [dropTarget, setDropTarget] = useState<string>();
  const changed = ordered.some((album, index) => album.slug !== albums[index].slug);

  function move(from: number, to: number) {
    if (disabled || from < 0 || !Number.isInteger(to) || to < 0 || to >= ordered.length || from === to) return;
    setOrdered(items => {
      const next = [...items];
      const [album] = next.splice(from, 1);
      next.splice(to, 0, album);
      return next;
    });
  }

  function endDrag() {
    setDragging(undefined);
    setDropTarget(undefined);
  }

  return (
    <section className="rounded-2xl border border-border-main bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-main p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-bold">Reorder albums</h2>
          <p className="mt-1 text-sm text-text-muted">Drag an album, use the arrows, or enter a new position.</p>
        </div>
        <button type="button" className={secondaryClass} disabled={disabled} onClick={onCancel}>Cancel</button>
      </div>
      <ol className="divide-y divide-border-main">
        {ordered.map((album, index) => (
          <li key={album.slug}
            className={`flex min-w-0 flex-wrap items-center gap-3 p-3 sm:px-5 ${dropTarget === album.slug ? 'bg-accent/10' : ''}`}
            onDragOver={event => {
              if (!dragging || disabled) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(album.slug);
            }}
            onDrop={event => {
              if (!dragging || disabled) return;
              event.preventDefault();
              move(ordered.findIndex(item => item.slug === dragging), index);
              endDrag();
            }}>
            <span aria-hidden="true" draggable={!disabled} className="cursor-grab p-1 text-text-muted active:cursor-grabbing"
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', album.slug);
                setDragging(album.slug);
              }} onDragEnd={endDrag}>
              <GripVertical className="size-5" />
            </span>
            <Cover album={album} />
            <div className="min-w-24 flex-1">
              <p className="truncate font-semibold">{album.album}</p>
              <p className="truncate text-sm text-text-muted">{album.artist}</p>
            </div>
            <div className="flex items-center gap-2">
              <input key={index} type="number" min={1} max={ordered.length} defaultValue={index + 1} disabled={disabled}
                aria-label={`Position of ${album.album}`} className={`${inputClass} max-w-17 px-2`}
                onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                onBlur={event => {
                  const position = event.currentTarget.valueAsNumber;
                  if (position >= 1 && position <= ordered.length && Number.isInteger(position)) move(index, position - 1);
                  else event.currentTarget.value = String(index + 1);
                }} />
              <button type="button" className={secondaryClass} aria-label={`Move ${album.album} up`} disabled={disabled || index === 0} onClick={() => move(index, index - 1)}><ArrowUp aria-hidden="true" className="size-4" /></button>
              <button type="button" className={secondaryClass} aria-label={`Move ${album.album} down`} disabled={disabled || index === ordered.length - 1} onClick={() => move(index, index + 1)}><ArrowDown aria-hidden="true" className="size-4" /></button>
            </div>
          </li>
        ))}
      </ol>
      <div className="sticky bottom-0 border-t border-border-main bg-surface p-4 sm:p-5">
        <button type="button" className={submitClass} disabled={disabled || !changed} onClick={() => onSave(ordered.map(album => album.slug))}>Save order</button>
      </div>
    </section>
  );
}

export default function AlbumManager({ locking }: { locking: boolean }) {
  const [catalog, setCatalog] = useState<AlbumCatalog>();
  const [receipt, setReceipt] = useState<AlbumReceipt>();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [group, setGroup] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const disabled = busy || locking;

  useEffect(() => {
    const controller = new AbortController();
    void request<AlbumCatalog>('albums', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setCatalog(result);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The collection could not be loaded.');
    });
    return () => controller.abort();
  }, [loadAttempt]);

  function back() {
    setError('');
    setView({ kind: 'list' });
  }

  async function save(data: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const result = await request<AlbumReceipt & { catalog: AlbumCatalog }>('albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setCatalog(result.catalog);
      setReceipt(result);
      setView({ kind: 'list' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The change could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  function reload() {
    back();
    setCatalog(undefined);
    setLoadAttempt(count => count + 1);
  }

  if (!catalog) return error ? (
    <div className="rounded-xl border border-border-main bg-surface p-5">
      <p role="alert" className="mb-4">{error}</p>
      <button type="button" className={secondaryClass} onClick={reload}>Retry loading albums</button>
    </div>
  ) : <p role="status" className="text-text-muted">Loading albums…</p>;

  const active = catalog.albums.filter(album => !album.archived).sort((a, b) => a.rank - b.rank);
  const archived = catalog.albums.filter(album => album.archived).sort((a, b) => a.album.localeCompare(b.album));
  const genres = [...new Set(catalog.albums.map(album => album.genre))].sort();
  const years = [...new Set(catalog.albums.map(album => album.year))].sort((a, b) => b - a);
  const query = search.trim().toLocaleLowerCase();
  const visible = (group === 'active' ? active : archived).filter(album =>
    (!query || `${album.album} ${album.artist}`.toLocaleLowerCase().includes(query))
    && (!genre || album.genre === genre) && (!year || String(album.year) === year));

  return (
    <>
      {receipt && <PublishNotice key={receipt.commit ?? receipt.message} receipt={receipt} active={active.some(album => album.slug === receipt.slug)} />}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-main bg-surface p-4">
          <p>{error}</p>
          <button type="button" className={secondaryClass} disabled={disabled} onClick={reload}>Reload albums</button>
        </div>
      )}
      {(view.kind === 'create' || view.kind === 'edit') && (
        <AlbumEditorForm key={view.kind === 'edit' ? view.album.slug : 'create'} album={view.kind === 'edit' ? view.album : undefined}
          genres={genres} busy={disabled} onCancel={back} onSave={save} />
      )}
      {view.kind === 'order' && <AlbumOrder albums={active} disabled={disabled} onCancel={back}
        onSave={order => void save({ action: 'reorder', order, revision: catalog.orderRevision })} />}
      {view.kind === 'history' && <AlbumVersionHistory album={view.album} busy={disabled} onBack={back}
        onRestore={commit => void save({ action: 'restoreVersion', slug: view.album.slug, revision: view.album.revision, commit })} />}
      {view.kind === 'list' && (
        <section className="overflow-hidden rounded-2xl border border-border-main bg-surface" aria-label="Albums">
          <div className="space-y-4 border-b border-border-main p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Album collection">
                {(['active', 'archived'] as const).map(collection => (
                  <button key={collection} type="button" aria-pressed={group === collection} disabled={disabled}
                    onClick={() => setGroup(collection)} className={`${secondaryClass} aria-pressed:border-accent aria-pressed:bg-accent/10`}>
                    {collection === 'active' ? `Active (${active.length})` : `Archived (${archived.length})`}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryClass} disabled={disabled || active.length < 2} onClick={() => setView({ kind: 'order' })}>
                  <ListOrdered aria-hidden="true" className="size-4" /> Reorder
                </button>
                <button type="button" className={`${submitClass} inline-flex items-center gap-2 text-sm`} disabled={disabled} onClick={() => setView({ kind: 'create' })}>
                  <Plus aria-hidden="true" className="size-4" /> Add an album
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,11rem)_8rem]">
              <label className="relative min-w-0">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-text-muted" />
                <input type="search" aria-label="Search albums" value={search} onChange={event => setSearch(event.target.value)}
                  className={`${inputClass} pl-9`} placeholder="Search by album or artist" />
              </label>
              <select aria-label="Genre" value={genre} onChange={event => setGenre(event.target.value)} className={inputClass}>
                <option value="">All genres</option>
                {genres.map(item => <option key={item}>{item}</option>)}
              </select>
              <select aria-label="Year" value={year} onChange={event => setYear(event.target.value)} className={inputClass}>
                <option value="">All years</option>
                {years.map(item => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          {visible.length === 0 ? <p role="status" className="p-6 text-text-muted">{search || genre || year ? 'No albums match your filters.' : 'No albums in this collection.'}</p> : (
            <ul className="divide-y divide-border-main">
              {visible.map(album => (
                <li key={album.slug} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4">
                  <Cover album={album} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{album.album}</p>
                    <p className="truncate text-sm text-text-muted">{album.artist} · {album.year} · {album.genre}</p>
                  </div>
                  {!album.archived && <span className="shrink-0 text-sm tabular-nums text-text-muted">Rank {album.rank}</span>}
                  <div className="flex w-full flex-wrap gap-2 pl-15 sm:w-auto sm:pl-0">
                    <button type="button" className={secondaryClass} disabled={disabled} aria-label={`Edit ${album.album}`} onClick={() => setView({ kind: 'edit', album })}>
                      <Pencil aria-hidden="true" className="size-4" /> Edit
                    </button>
                    {online && <button type="button" className={secondaryClass} disabled={disabled} aria-label={`History of ${album.album}`} onClick={() => setView({ kind: 'history', album })}>
                      <History aria-hidden="true" className="size-4" /> History
                    </button>}
                    <button type="button" className={secondaryClass} disabled={disabled}
                      aria-label={`${album.archived ? 'Restore' : 'Archive'} ${album.album}`}
                      onClick={() => void save({ action: album.archived ? 'restore' : 'archive', slug: album.slug, revision: album.revision })}>
                      {album.archived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                      {album.archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

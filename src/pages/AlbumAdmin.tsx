import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Lock, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MY_ALBUMS } from '../albums';

type SavedAlbum = { slug: string; title: string };
type EditorStatus = 'loading' | 'unconfigured' | 'locked' | 'unlocked' | 'unavailable';
type Session = { pinConfigured: boolean; authenticated: boolean; savedAlbum?: SavedAlbum };

const apiBase = `${import.meta.env.BASE_URL}api/album-admin`;
const genres = [...new Set(MY_ALBUMS.map(album => album.genre))].sort();
const inputClass = 'w-full rounded-lg border border-border-main bg-bg px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-offset-2 focus:outline-accent';
const submitClass = 'rounded-lg bg-accent px-5 py-2.5 font-bold text-[#212529] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60';

class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new RequestError(response.status, body.error);
  return body;
}

function encodeFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('The cover file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function prepareCover(file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) {
    throw new Error('Choose a cover smaller than 10 MB.');
  }
  const cover = await createImageBitmap(file).catch(() => {
    throw new Error('Choose a valid JPEG, PNG, or WebP image.');
  });
  try {
    const scale = Math.min(1, 480 / Math.max(cover.width, cover.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cover.width * scale));
    canvas.height = Math.max(1, Math.round(cover.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not prepare the thumbnail.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(cover, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob?.type === 'image/webp') resolve(blob);
        else reject(new Error('The browser could not create a WebP thumbnail.'));
      }, 'image/webp', 0.82);
    });
    const [originalData, thumbnailData] = await Promise.all([encodeFile(file), encodeFile(thumbnail)]);
    return { cover: originalData, thumbnail: thumbnailData };
  } finally {
    cover.close();
  }
}

export default function AlbumAdmin() {
  const [status, setStatus] = useState<EditorStatus>('loading');
  const [savedAlbum, setSavedAlbum] = useState<SavedAlbum>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void request<Session>('session', { signal: controller.signal }).then(session => {
      setStatus(session.authenticated ? 'unlocked' : session.pinConfigured ? 'locked' : 'unconfigured');
      setSavedAlbum(session.savedAlbum);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setStatus('unavailable');
      setError(reason instanceof RequestError ? reason.message : 'The local editor could not connect to Vite.');
    });
    return () => controller.abort();
  }, []);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const pin = new FormData(form).get('pin');
    setBusy(true);
    setError('');
    try {
      await request('session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      setStatus('unlocked');
    } catch (reason) {
      form.reset();
      setError(reason instanceof RequestError ? reason.message : 'The editor could not be unlocked. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    setError('');
    try {
      await request('session', { method: 'DELETE' });
      setSavedAlbum(undefined);
      setStatus('locked');
    } catch (reason) {
      setError(reason instanceof RequestError ? reason.message : 'The editor could not be locked. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('artwork');
    if (!(file instanceof File)) return;
    fields.delete('artwork');

    setBusy(true);
    setError('');
    try {
      const images = await prepareCover(file);
      const saved = await request<SavedAlbum>('albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(fields), ...images }),
      });
      setSavedAlbum(saved);
      form.reset();
    } catch (reason) {
      if (reason instanceof RequestError && reason.status === 401) setStatus('locked');
      setError(reason instanceof Error ? reason.message : 'The album could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to collection
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Add an album</h1>
        {status === 'unlocked' && (
          <button type="button" onClick={lock} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-border-main px-3 py-2 text-sm font-medium disabled:opacity-60">
            <LogOut aria-hidden="true" className="size-4" /> Lock editor
          </button>
        )}
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-border-main bg-surface p-4 text-text-primary">{error}</p>}
      {status === 'loading' && <p role="status" className="text-text-muted">Checking editor access…</p>}
      {status === 'unconfigured' && (
        <p className="rounded-xl border border-border-main bg-surface p-5 text-text-muted">
          Set <code>ALBUM_ADMIN_PIN</code> to a 6–12 digit PIN in <code>.env.local</code> and restart Vite.
        </p>
      )}
      {status === 'locked' && (
        <form onSubmit={unlock} className="max-w-md space-y-4 rounded-xl border border-border-main bg-surface p-5 sm:p-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Editor PIN</span>
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6,12}" maxLength={12} autoComplete="off" required className={inputClass} />
          </label>
          <button type="submit" disabled={busy} className={`${submitClass} inline-flex items-center gap-2`}>
            <Lock aria-hidden="true" className="size-4" /> {busy ? 'Unlocking…' : 'Unlock editor'}
          </button>
        </form>
      )}
      {status === 'unlocked' && (
        <>
          {savedAlbum && (
            <p role="status" className="mb-4 rounded-lg border border-border-main bg-surface p-4">
              Added <strong>{savedAlbum.title}</strong>.{' '}
              <Link to={`/album/${savedAlbum.slug}`} className="underline underline-offset-2">Open album</Link>
            </p>
          )}
          <form onSubmit={addAlbum} className="grid gap-5 rounded-xl border border-border-main bg-surface p-5 sm:grid-cols-2 sm:p-6">
            <label className="space-y-2">
              <span className="text-sm font-medium">Album title</span>
              <input name="album" required maxLength={120} className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Artist</span>
              <input name="artist" required maxLength={120} className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Release year</span>
              <input name="year" type="number" min={1900} max={2100} required className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Genre</span>
              <input name="genre" list="album-genres" required maxLength={60} className={inputClass} />
              <datalist id="album-genres">{genres.map(genre => <option key={genre} value={genre} />)}</datalist>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Rating</span>
              <select name="rating" defaultValue="5" className={inputClass}>
                {[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Rank <span className="font-normal text-text-muted">(optional)</span></span>
              <input name="rank" type="number" min={1} placeholder="Next available" className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Spotify album link or ID</span>
              <input name="spotify" required maxLength={500} className={inputClass} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Apple Music album link</span>
              <input name="apple" type="url" required maxLength={500} className={inputClass} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">URL slug <span className="font-normal text-text-muted">(optional)</span></span>
              <input name="slug" placeholder="Generated from the album title" maxLength={120} className={inputClass} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">Album cover</span>
              <input
                name="artwork"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-2 file:py-1 file:text-text-primary`}
              />
              <span className="block text-xs text-text-muted">JPEG, PNG, or WebP up to 10 MB. A gallery thumbnail is created automatically.</span>
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">Summary</span>
              <textarea name="summary" rows={4} required maxLength={4000} className={inputClass} />
            </label>
            <button type="submit" disabled={busy} className={`${submitClass} justify-self-start sm:col-span-2`}>
              {busy ? 'Saving…' : 'Save album'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}

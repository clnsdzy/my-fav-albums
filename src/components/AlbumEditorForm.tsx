import { useEffect, useState, type FormEvent } from 'react';
import type { ManagedAlbum } from '../lib/album-management';
import { getAlbumCoverPath } from '../lib/album-assets';
import { inputClass, secondaryClass, submitClass } from './album-admin-styles';

const online = import.meta.env.PROD;

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

  function renderWebp(maxEdge: number, quality: number): Promise<Blob> {
    const scale = Math.min(1, maxEdge / Math.max(cover.width, cover.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cover.width * scale));
    canvas.height = Math.max(1, Math.round(cover.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The browser could not prepare the artwork.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(cover, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob?.type === 'image/webp') resolve(blob);
        else reject(new Error('The browser could not create WebP artwork.'));
      }, 'image/webp', quality);
    });
  }

  try {
    let uploadCover: Blob = file;
    if (online) {
      uploadCover = await renderWebp(1600, 0.87);
      if (uploadCover.size > 2 * 1024 * 1024) uploadCover = await renderWebp(1200, 0.78);
      if (uploadCover.size > 2 * 1024 * 1024) throw new Error('Choose a smaller album cover.');
    }
    const thumbnail = await renderWebp(480, 0.82);
    const [originalData, thumbnailData] = await Promise.all([encodeFile(uploadCover), encodeFile(thumbnail)]);
    return { cover: originalData, thumbnail: thumbnailData };
  } finally {
    cover.close();
  }
}

export default function AlbumEditorForm({ album, genres, busy, onCancel, onSave }: {
  album?: ManagedAlbum;
  genres: string[];
  busy: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [fileError, setFileError] = useState('');
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const artwork = fields.get('artwork');
    fields.delete('artwork');
    setPreparing(true);
    setFileError('');
    try {
      const images = artwork instanceof File && artwork.size > 0 ? await prepareCover(artwork) : {};
      await onSave({ ...Object.fromEntries(fields), ...images, action: album ? 'edit' : 'create', revision: album?.revision });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'The artwork could not be prepared.');
    } finally {
      setPreparing(false);
    }
  }

  const cover = preview || (album && String(import.meta.env.BASE_URL) + getAlbumCoverPath(album.image));
  return (
    <section className="rounded-2xl border border-border-main bg-surface p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{album ? 'Edit album' : 'Add an album'}</h2>
          {album && <p className="mt-1 truncate text-sm text-text-muted">{album.album} · {album.artist}</p>}
        </div>
        <button type="button" onClick={onCancel} disabled={busy || preparing} className={secondaryClass}>Back to albums</button>
      </div>
      {cover && <img src={cover} alt={preview ? 'Selected cover preview' : 'Current album cover'} className="mb-5 size-32 rounded-xl border border-border-main object-cover" />}
      {fileError && <p role="alert" className="mb-4 text-sm text-accent-text">{fileError}</p>}
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Album title</span>
          <input name="album" defaultValue={album?.album} required maxLength={120} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Artist</span>
          <input name="artist" defaultValue={album?.artist} required maxLength={120} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Release year</span>
          <input name="year" defaultValue={album?.year} type="number" min={1900} max={2100} required className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Genre</span>
          <input name="genre" defaultValue={album?.genre} list="album-genres" required maxLength={60} className={inputClass} />
          <datalist id="album-genres">{genres.map(genre => <option key={genre} value={genre} />)}</datalist>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Rating</span>
          <select name="rating" defaultValue={album?.rating ?? 5} className={inputClass}>
            {[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
          </select>
        </label>
        {!album && <label className="space-y-2">
          <span className="text-sm font-medium">Rank <span className="font-normal text-text-muted">(optional)</span></span>
          <input name="rank" type="number" min={1} placeholder="Next available" className={inputClass} />
        </label>}
        <label className="space-y-2">
          <span className="text-sm font-medium">Spotify album link or ID</span>
          <input name="spotify" defaultValue={album?.spotify_id} required maxLength={500} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Apple Music album link</span>
          <input name="apple" defaultValue={album?.apple_url} type="url" required maxLength={500} className={inputClass} />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">URL slug {!album && <span className="font-normal text-text-muted">(optional)</span>}</span>
          <input name="slug" readOnly={Boolean(album)} defaultValue={album?.slug} placeholder="Generated from the album title" maxLength={120} className={inputClass} />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">{album ? 'Replace cover (optional)' : 'Album cover'}</span>
          <input
            name="artwork"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!album}
            onChange={event => setFile(event.currentTarget.files?.[0])}
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-2 file:py-1 file:text-text-primary`}
          />
          <span className="block text-xs text-text-muted">JPEG, PNG, or WebP up to 10 MB. A gallery thumbnail is created automatically.</span>
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">Summary</span>
          <textarea name="summary" defaultValue={album?.summary} rows={4} required maxLength={4000} className={inputClass} />
        </label>
        <button type="submit" disabled={busy || preparing} className={`${submitClass} justify-self-start sm:col-span-2`}>
          {busy || preparing ? 'Saving…' : album ? 'Save changes' : (online ? 'Publish album' : 'Save album')}
        </button>
      </form>
    </section>
  );
}

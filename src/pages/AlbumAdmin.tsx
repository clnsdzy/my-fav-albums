import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Lock, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlbumManager from '../components/AlbumManager';
import { inputClass, secondaryClass, submitClass } from '../components/album-admin-styles';
import { request, RequestError } from '../lib/album-admin-api';

type EditorStatus = 'loading' | 'unconfigured' | 'locked' | 'unlocked' | 'unavailable';
type Session = { pinConfigured: boolean; authenticated: boolean };

const online = import.meta.env.PROD;

export default function AlbumAdmin() {
  const [status, setStatus] = useState<EditorStatus>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void request<Session>('session', { signal: controller.signal }).then(session => {
      setStatus(session.authenticated ? 'unlocked' : session.pinConfigured ? 'locked' : 'unconfigured');
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setStatus('unavailable');
      setError(reason instanceof RequestError ? reason.message : 'The editor could not connect to the server.');
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
      setStatus('locked');
    } catch (reason) {
      setError(reason instanceof RequestError ? reason.message : 'The editor could not be locked. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-8 py-12 md:py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to collection
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Album Manager</h1>
        {status === 'unlocked' && (
          <button type="button" onClick={lock} disabled={busy} className={secondaryClass}>
            <LogOut aria-hidden="true" className="size-4" /> Lock editor
          </button>
        )}
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-border-main bg-surface p-4 text-text-primary">{error}</p>}
      {status === 'loading' && <p role="status" className="text-text-muted">Checking editor access…</p>}
      {status === 'unconfigured' && (
        <p className="rounded-xl border border-border-main bg-surface p-5 text-text-muted">
          {online
            ? 'The online editor is waiting for server setup.'
            : <>Set <code>ALBUM_ADMIN_PIN</code> to a 6–12 digit PIN in <code>.env.local</code> and restart Vite.</>}
        </p>
      )}
      {status === 'locked' && (
        <form onSubmit={unlock} className="max-w-md space-y-4 rounded-xl border border-border-main bg-surface p-5 sm:p-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Editor PIN</span>
            <input name="pin" type="password" inputMode="numeric" pattern={online ? '[0-9]{12}' : '[0-9]{6,12}'} maxLength={12} autoComplete="off" required className={inputClass} />
          </label>
          <button type="submit" disabled={busy} className={`${submitClass} inline-flex items-center gap-2`}>
            <Lock aria-hidden="true" className="size-4" /> {busy ? 'Unlocking…' : 'Unlock editor'}
          </button>
        </form>
      )}
      {status === 'unlocked' && <AlbumManager locking={busy} />}
    </main>
  );
}

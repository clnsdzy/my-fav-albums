import { useEffect, useState } from 'react';
import { ArrowUpRight, Music2 } from 'lucide-react';
import { isSpotifyCoverUrl, isSpotifyTrackUrl, type ListeningTrack } from '../../spotify-status/status';

const spotifyLogo = `${import.meta.env.BASE_URL}spotify/`;

type VisibleStatus = { status: 'playing' | 'last-played'; track: ListeningTrack };

function visibleStatus(data: Partial<VisibleStatus> | null): VisibleStatus | null {
  if (!data || (data.status !== 'playing' && data.status !== 'last-played')) return null;
  const { status, track } = data;
  if (typeof track?.title !== 'string' || typeof track.artist !== 'string' || !isSpotifyTrackUrl(track.url)) return null;
  return { status, track: { ...track, coverUrl: isSpotifyCoverUrl(track.coverUrl) ? track.coverUrl : undefined } };
}

export default function NowPlaying({ endpoint }: { endpoint: string }) {
  const [listening, setListening] = useState<VisibleStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;

    async function refresh() {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        });
        const status = response.ok ? visibleStatus(await response.json()) : null;
        if (!controller.signal.aborted) setListening(status);
      } catch {
        if (!controller.signal.aborted) setListening(null);
      } finally {
        inFlight = false;
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [endpoint]);

  if (!listening) return null;
  const { status, track } = listening;
  const playing = status === 'playing';

  return (
    <section aria-label="Spotify listening status" className="w-full max-w-sm rounded-xl border border-border-main bg-surface px-4 py-3.5 lg:shrink-0">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${playing ? 'bg-emerald-500' : 'bg-text-muted/45'}`} />
          {playing ? 'Now playing' : 'Last played'}
        </p>
        <img src={`${spotifyLogo}logo-white.png`} alt="Spotify" width={80} height={24} className="h-auto w-20 [.light_&]:hidden" />
        <img src={`${spotifyLogo}logo-black.png`} alt="Spotify" width={80} height={24} className="hidden h-auto w-20 [.light_&]:block" />
      </div>
      <a
        href={track.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Listen on Spotify · ${track.title} by ${track.artist}`}
        className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-text"
      >
        {track.coverUrl ? (
          <img src={track.coverUrl} alt="" width={52} height={52} className="size-13 shrink-0 rounded object-contain lg:rounded-lg" />
        ) : (
          <span className="flex size-13 shrink-0 items-center justify-center rounded bg-bg text-text-muted">
            <Music2 aria-hidden="true" className="size-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-text-primary group-hover:underline">{track.title}</span>
          <span className="block truncate text-sm text-text-muted">{track.artist}</span>
        </span>
        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
      </a>
    </section>
  );
}

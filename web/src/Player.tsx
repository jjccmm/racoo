import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadEpisode, type Passage } from './search';

import { PlaybackContext, type PlayerEpisode } from './playback';
type EpisodeRecord = Awaited<ReturnType<typeof loadEpisode>>;

function time(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function Player({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerEpisode | null>(null);
  const [targetTime, setTargetTime] = useState(0);
  const [playRequested, setPlayRequested] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [directState, setDirectState] = useState<'idle' | 'loading' | 'unknown' | 'error'>(() =>
    new URLSearchParams(window.location.search).has('episode') ? 'loading' : 'idle',
  );
  const active = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const appliedTimeline = useRef('');
  useEffect(() => () => active.current?.abort(), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const episodeId = url.searchParams.get('episode');
    if (!episodeId) return;
    const controller = new AbortController();
    active.current?.abort();
    active.current = controller;
    loadEpisode(episodeId, controller.signal).then((episode) => {
      if (controller.signal.aborted) return;
      if (!episode) { setDirectState('unknown'); return; }
      setPlayer(playerFrom(episode));
      setTargetTime(clamp(Number(url.searchParams.get('t') ?? 0), episode.audio.duration_seconds));
      setDirectState('idle');
    }).catch(() => { if (!controller.signal.aborted) setDirectState('error'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = audio.current;
    if (!player || !media) return;
    const key = `${player.episodeId}:${targetTime}`;
    if (appliedTimeline.current === key) return;
    const syncTimeline = () => {
      media.currentTime = clamp(targetTime, Number.isFinite(media.duration) ? media.duration : player.durationSeconds);
      appliedTimeline.current = key;
      if (playRequested) {
        void media.play().catch(() => setMediaError(true));
        setPlayRequested(false);
      }
    };
    if (media.readyState >= HTMLMediaElement.HAVE_METADATA) syncTimeline();
    else {
      media.addEventListener('loadedmetadata', syncTimeline, { once: true });
      media.load();
    }
    return () => media.removeEventListener('loadedmetadata', syncTimeline);
  }, [player, targetTime, playRequested]);

  function choose(episode: PlayerEpisode, passage: Passage) {
    const url = new URL(window.location.href);
    url.searchParams.set('episode', episode.episodeId);
    url.searchParams.set('t', String(Math.round(passage.start_seconds)));
    window.history.replaceState(null, '', url);
    setMediaError(false);
    setTargetTime(passage.start_seconds);
    appliedTimeline.current = '';
    setPlayer(episode);
    setPlayRequested(true);
  }

  function nudge(seconds: number) {
    if (!audio.current || !player) return;
    const duration = Number.isFinite(audio.current.duration) ? audio.current.duration : player.durationSeconds;
    audio.current.currentTime = clamp(audio.current.currentTime + seconds, duration);
  }

  const directEpisode = directState === 'unknown' ? 'unknown' : directState === 'error' ? 'error' : null;
  return <PlaybackContext.Provider value={choose}>
    {children}
    {directState === 'loading' && <p role="status">Geteilte Folge wird geladen …</p>}
    {directEpisode === 'unknown' && <p role="status">Diese Episoden-ID ist im aktuellen Suchstand unbekannt.</p>}
    {directEpisode === 'error' && <p role="alert">Die geteilte Folge konnte nicht geladen werden. <button onClick={() => window.location.reload()}>Geteilte Folge erneut laden</button></p>}
    {player && <section className="player" aria-label="Gemeinsamer Audioplayer">
      <h2>Wiedergabe: {player.title}</h2>
      <p>{time(targetTime)} · Sprung zum Segmentanfang. Werbung kann die Zeit in der Online-Audiodatei verschieben.</p>
      <audio ref={audio} src={player.audioUrl} controls preload="metadata" onError={() => setMediaError(true)} />
      <div className="player-controls">
        <button type="button" onClick={() => nudge(-10)}>10 Sekunden zurück</button>
        <button type="button" onClick={() => nudge(10)}>10 Sekunden vor</button>
        <a href={shareHref(player.episodeId, targetTime)}>Fundstelle teilen</a>
      </div>
      {mediaError && <p role="alert">Audio nicht verfügbar. <a href={player.webpageUrl} target="_blank" rel="noreferrer">Zur Episodenseite</a></p>}
    </section>}
  </PlaybackContext.Provider>;
}

function playerFrom(episode: NonNullable<EpisodeRecord>): PlayerEpisode {
  return {
    episodeId: episode.episode_id, title: episode.title, publishedAt: episode.published_at,
    audioUrl: episode.audio.url, durationSeconds: episode.audio.duration_seconds,
    webpageUrl: episode.webpage_url ?? episode.source.reference_url,
  };
}

function clamp(seconds: number, duration: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.min(duration, seconds)) : 0;
}

function shareHref(episodeId: string, seconds: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('episode', episodeId);
  url.searchParams.set('t', String(Math.round(seconds)));
  return `${url.pathname}${url.search}`;
}

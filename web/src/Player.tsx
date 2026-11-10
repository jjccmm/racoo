import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadEpisode, type Passage } from './search';

import { PlaybackContext, formatPlaybackTime, type PlayerEpisode } from './playback';
type EpisodeRecord = Awaited<ReturnType<typeof loadEpisode>>;

export function Player({ children, dataBase, podcastId }: { children: ReactNode; dataBase: string; podcastId: string }) {
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
  const generation = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const episodeId = url.searchParams.get('episode');
    if (!episodeId) return;
    const controller = new AbortController();
    active.current?.abort();
    active.current = controller;
    loadEpisode(episodeId, controller.signal, dataBase).then((episode) => {
      if (controller.signal.aborted) return;
      if (!episode) { setDirectState('unknown'); return; }
      setPlayer(playerFrom(episode));
      setTargetTime(clamp(Number(url.searchParams.get('t') ?? 0), episode.audio.duration_seconds));
      setDirectState('idle');
    }).catch(() => { if (!controller.signal.aborted) setDirectState('error'); });
    return () => controller.abort();
  }, [dataBase]);

  useEffect(() => {
    const media = audio.current;
    if (!player || !media) return;
    const key = `${player.episodeId}:${targetTime}`;
    if (appliedTimeline.current === key) return;
    const currentGeneration = generation.current;
    const syncTimeline = () => {
      if (currentGeneration !== generation.current || audio.current !== media) return;
      media.currentTime = clamp(targetTime, Number.isFinite(media.duration) ? media.duration : player.durationSeconds);
      appliedTimeline.current = key;
      if (playRequested) {
        void media.play().catch(() => { if (generation.current === currentGeneration && audio.current === media) setMediaError(true); });
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

  function choose(episode: PlayerEpisode, position: Passage | number) {
    const start = clamp(typeof position === 'number' ? position : position.start_seconds, episode.durationSeconds);
    generation.current++;
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    active.current?.abort();
    active.current = null;
    setDirectState('idle');
    const url = new URL(window.location.href);
    url.searchParams.set('episode', episode.episodeId);
    url.searchParams.set('t', String(Math.round(start)));
    window.history.replaceState(null, '', url);
    setMediaError(false);
    setTargetTime(start);
    appliedTimeline.current = '';
    setPlayer(episode);
    setPlayRequested(true);
  }

  function close() {
    generation.current++;
    active.current?.abort(); active.current = null;
    audio.current?.pause();
    if (audio.current) { audio.current.removeAttribute('src'); audio.current.load(); }
    setPlayer(null); setPlayRequested(false); setMediaError(false); setDirectState('idle');
    appliedTimeline.current = '';
    const url = new URL(location.href);
    url.searchParams.set('podcast', podcastId); url.searchParams.delete('episode'); url.searchParams.delete('t');
    history.replaceState(null, '', url);
    requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); });
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
      <div className="player-heading"><h2>Wiedergabe: {player.title}</h2><button className="player-close" type="button" onClick={close} aria-label="Player schließen">×</button></div>
      <p>{formatPlaybackTime(targetTime)} · {targetTime === 0 ? 'Wiedergabe ab Anfang.' : 'Sprung zum Beginn des Textabschnitts.'} Werbung kann die Zeit in der Online-Audiodatei verschieben.</p>
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

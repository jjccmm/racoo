import { createContext } from 'react';
import type { Passage, SearchResult } from './search';
export type PlayerEpisode = Pick<SearchResult, 'episodeId' | 'title' | 'publishedAt' | 'audioUrl' | 'durationSeconds' | 'webpageUrl'>;
export type StartPlayback = (episode: PlayerEpisode, position: Passage | number) => void;
export const PlaybackContext = createContext<StartPlayback>(() => {});

export function formatPlaybackTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

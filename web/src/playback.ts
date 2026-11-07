import { createContext } from 'react';
import type { Passage, SearchResult } from './search';
export type PlayerEpisode = Pick<SearchResult, 'episodeId' | 'title' | 'publishedAt' | 'audioUrl' | 'durationSeconds' | 'webpageUrl'>;
export const PlaybackContext = createContext<(episode: PlayerEpisode, passage: Passage) => void>(() => {});

export function formatPlaybackTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

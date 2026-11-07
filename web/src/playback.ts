import { createContext } from 'react';
import type { Passage, SearchResult } from './search';
export type PlayerEpisode = Pick<SearchResult, 'episodeId' | 'title' | 'publishedAt' | 'audioUrl' | 'durationSeconds' | 'webpageUrl'>;
export const PlaybackContext = createContext<(episode: PlayerEpisode, passage: Passage) => void>(() => {});

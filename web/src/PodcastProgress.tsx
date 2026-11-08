import type { Podcast } from './podcasts';

export function PodcastProgress({ podcast }: { podcast: Podcast }) {
  return <p className="podcast-progress">
    {podcast.episodeCount.toLocaleString('de-DE')}/{podcast.knownEpisodeCount.toLocaleString('de-DE')} Folgen durchsuchbar (Stand {podcast.lastCheckedAt ? <time dateTime={podcast.lastCheckedAt}>{new Date(podcast.lastCheckedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}</time> : 'unbekannt'})
  </p>;
}

import type { Podcast } from './podcasts';

export function PodcastProgress({ podcast }: { podcast: Podcast }) {
  return <p className="podcast-progress">
    <span>{podcast.episodeCount.toLocaleString('de-DE')} von {podcast.knownEpisodeCount.toLocaleString('de-DE')} bekannten Folgen durchsuchbar</span>
    <small>{podcast.lastCheckedAt ? <>Feed geprüft am <time dateTime={podcast.lastCheckedAt}>{new Date(podcast.lastCheckedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}</time></> : 'Feed noch nicht geprüft'}</small>
  </p>;
}

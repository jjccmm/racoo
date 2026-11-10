import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SearchResult, Passage } from './search';
import type { PlayerEpisode } from './playback';
import { formatPlaybackTime } from './playback';
import { wordStyle } from './word-colors';
import { HighlightedText, type ColoredTerm } from './HighlightedText';
import { TranscriptMinimap } from './TranscriptMinimap';

function paragraphs(text: string) {
  const result: { from: number; to: number }[] = []; let from = 0;
  for (const ending of text.matchAll(/[.!?][”"’)]*\s+/gu)) {
    const to = ending.index + ending[0].length;
    if (to - from >= 450) { result.push({ from, to }); from = to; }
  }
  if (from < text.length) result.push({ from, to: text.length });
  return result;
}
export function TranscriptReader({ result, words, onChoose, onClose }: {
  result: SearchResult; words: ColoredTerm[]; onChoose(episode: PlayerEpisode, passage: Passage): void; onClose(): void;
}) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState<string>();
  const highlights = useMemo(() => new Map(result.passages.map(passage => [passage.id, passage.highlights])), [result]);
  const hits = useMemo(() => result.segments.flatMap(segment => (highlights.get(segment.id) ?? []).map(range => ({ id: `${segment.id}:${range.start}`, segment, terms: range.terms }))), [result, highlights]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const select = useCallback((hitId: string) => {
    const mark = transcript.current?.querySelector<HTMLElement>(`[data-hit-id="${CSS.escape(hitId)}"]`);
    const container = scroller.current;
    if (!mark || !container) return;
    setActive(hitId);
    const top = mark.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - container.clientHeight * .4;
    container.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);
  useEffect(() => {
    const marks = transcript.current?.querySelectorAll<HTMLElement>('[data-hit-id]') ?? [];
    for (const mark of marks) {
      if (mark.dataset.hitId === active) mark.setAttribute('data-current', 'true'); else mark.removeAttribute('data-current');
    }
  }, [active]);
  function navigate(direction: number) {
    const index = hits.findIndex(hit => hit.id === active);
    const next = index < 0 ? (direction > 0 ? 0 : hits.length - 1) : (index + direction + hits.length) % hits.length;
    if (hits[next]) select(hits[next].id);
  }
  const index = hits.findIndex(hit => hit.id === active);
  return <section className="transcript-reader" aria-label={`Transkript: ${result.title}`}>
    <div className="reader-toolbar"><h4 ref={heading} tabIndex={-1}>Transkript</h4>
      <div className="match-navigation"><span role="status" aria-live="polite">{index < 0 ? `${hits.length} ${hits.length === 1 ? 'Fundstelle' : 'Fundstellen'}` : `${index + 1}/${hits.length}`}</span>
        <button disabled={!hits.length} onClick={() => navigate(-1)} aria-label="Vorherige Fundstelle">↑</button><button disabled={!hits.length} onClick={() => navigate(1)} aria-label="Nächste Fundstelle">↓</button>
        <button onClick={onClose} aria-label="Transkript schließen">×</button>
      </div>
    </div>
    <ul className="reader-legend" aria-label="Suchwörter im Transkript">{words.map(word => <li key={word.term} style={wordStyle(word.color)}><i />{word.term}<span>{result.positionsByTerm[word.term]?.length ?? 0}</span></li>)}</ul>
    <div className="reader-layout">
      <div className="reader-scroll" id={id} ref={scroller} tabIndex={0} role="region" aria-label="Vollständiger Transkripttext">
        <div className="transcript" ref={transcript}>
          {result.segments.map((segment, number) => {
            const ranges = highlights.get(segment.id) ?? [];
            const passage = { ...segment, highlights: ranges, terms: [...new Set(ranges.flatMap(range => range.terms))] };
            return <section key={segment.id} className="reader-segment" data-segment-id={segment.id}>
              <div className="segment-label"><span>Segment {String(number + 1).padStart(2, '0')}</span><button aria-label={`Anhören ab ${formatPlaybackTime(segment.start_seconds)}`} aria-describedby={`jump-hint-${result.episodeId}`} onClick={() => onChoose(result, passage)}>▶ {formatPlaybackTime(segment.start_seconds)}</button></div>
              {paragraphs(segment.text).map(({ from, to }) => <p key={from}><HighlightedText text={segment.text} highlights={ranges} words={words} from={from} to={to} segmentId={segment.id} /></p>)}
            </section>;
          })}
        </div>
      </div>
      <TranscriptMinimap scroller={scroller} transcript={transcript} words={words} active={active} onHit={select} controls={id} />
    </div>
    <p className="reader-caption">Ganzes Transkript · Farben zeigen deine Suchwörter. Die Minimap navigiert im Text; Audio springt zum Segmentanfang.</p>
  </section>;
}

import { useCallback, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from 'react';
import type { SearchResult } from './search';
import { formatPlaybackTime, type StartPlayback } from './playback';
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
export function TranscriptReader({ result, words, onChoose }: { result: SearchResult; words: ColoredTerm[]; onChoose: StartPlayback }) {
  const id = useId(), scroller = useRef<HTMLDivElement>(null), transcript = useRef<HTMLDivElement>(null);
  const highlights = useMemo(() => new Map(result.passages.map(passage => [passage.id, passage.highlights])), [result]);
  const hits = useMemo(() => result.segments.flatMap(segment => (highlights.get(segment.id) ?? []).map(range => ({ id: `${segment.id}:${range.start}`, segment, terms: range.terms }))), [result, highlights]);
  const first = words.flatMap(word => hits.filter(hit => hit.terms.includes(word.term))).at(0)?.id;
  const [active, setActive] = useState(first);
  const scrollToHit = useCallback((hitId: string, immediate = false) => {
    const mark = transcript.current?.querySelector<HTMLElement>(`[data-hit-id="${CSS.escape(hitId)}"]`), container = scroller.current;
    if (!mark || !container) return;
    const top = mark.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - container.clientHeight * .35;
    container.scrollTo({ top, behavior: immediate || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);
  useLayoutEffect(() => { if (first) scrollToHit(first, true); }, [first, scrollToHit]);
  useLayoutEffect(() => {
    const container = scroller.current; if (!container) return;
    let width = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth !== width) { width = container.clientWidth; if (active) scrollToHit(active, true); }
    });
    observer.observe(container); return () => observer.disconnect();
  }, [active, scrollToHit]);
  const select = useCallback((hitId: string) => { setActive(hitId); scrollToHit(hitId); }, [scrollToHit]);
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
    <div className="reader-toolbar">
      <span className="muted">Fundstellen</span>
      <div className="match-navigation"><span role="status" aria-live="polite">{index < 0 ? `${hits.length} Fundstellen` : `${index + 1}/${hits.length}`}</span>
        <button disabled={!hits.length} onClick={() => navigate(-1)} aria-label="Vorherige Fundstelle">↑</button><button disabled={!hits.length} onClick={() => navigate(1)} aria-label="Nächste Fundstelle">↓</button>
      </div>
    </div>
    <div className="reader-layout">
      <div className="reader-scroll" id={id} ref={scroller} tabIndex={0} role="region" aria-label="Vollständiger Transkripttext">
        <div className="transcript" ref={transcript}>
          {result.segments.map(segment => {
            const ranges = highlights.get(segment.id) ?? [];
            return <section key={segment.id} className="reader-segment" data-segment-id={segment.id}>
              <div className="segment-label"><button aria-label={`Anhören ab ${formatPlaybackTime(segment.start_seconds)}`} aria-describedby={`jump-hint-${result.episodeId}`} onClick={() => onChoose(result, segment.start_seconds)}>▶ {formatPlaybackTime(segment.start_seconds)}</button></div>
              {paragraphs(segment.text).map(({ from, to }) => <p key={from}><HighlightedText text={segment.text} highlights={ranges} words={words} from={from} to={to} segmentId={segment.id} /></p>)}
            </section>;
          })}
        </div>
      </div>
      <TranscriptMinimap scroller={scroller} transcript={transcript} words={words} active={active} onHit={select} controls={id} />
    </div>
    <p className="reader-caption" id={`jump-hint-${result.episodeId}`}>Die Zeitknöpfe starten am Beginn des Textabschnitts. Werbung kann die Zeit in der Online-Audiodatei verschieben.</p>
  </section>;
}

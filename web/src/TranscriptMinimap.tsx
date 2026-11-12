import { useEffect, useRef, type RefObject } from 'react';
import type { ColoredTerm } from './HighlightedText';

type Hit = { id: string; y: number; x: number; width: number; terms: string[] };
export function TranscriptMinimap({ scroller, transcript, words, active, onHit, controls }: {
  scroller: RefObject<HTMLDivElement | null>; transcript: RefObject<HTMLDivElement | null>;
  words: ColoredTerm[]; active?: string; onHit(id: string): void; controls: string;
}) {
  const surface = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), thumb = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = surface.current, drawing = canvas.current, viewport = thumb.current, scroll = scroller.current, text = transcript.current;
    if (!map || !drawing || !viewport || !scroll || !text) return;
    const ctx = drawing.getContext('2d'); if (!ctx) return;
    let frame = 0, scrollFrame = 0;
    let lines: { y: number; width: number }[] = [], hits: Hit[] = [];
    let drag: { id: number; start: number; offset: number; moved: boolean } | undefined;
    const events = new AbortController();
    const signal = events.signal;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function scrollTo(top: number, immediate = false) {
      scroll!.scrollTo({ top, behavior: immediate || reduced.matches ? 'instant' : 'smooth' });
    }
    function updateViewport() {
      const height = map!.clientHeight;
      const total = Math.max(1, scroll!.scrollHeight), visible = scroll!.clientHeight;
      const thumbHeight = Math.min(height, Math.max(6, visible / total * height));
      viewport!.style.top = `${Math.min(height - thumbHeight, scroll!.scrollTop / total * height)}px`;
      viewport!.style.height = `${thumbHeight}px`;
      const percent = Math.round(scroll!.scrollTop / Math.max(1, total - visible) * 100);
      map!.setAttribute('aria-valuenow', String(percent));
      map!.setAttribute('aria-valuetext', `${percent} Prozent des Transkripts`);
    }
    function paint() {
      const width = map!.clientWidth, height = map!.clientHeight;
      if (!width || !height) return;
      const density = window.devicePixelRatio || 1;
      drawing!.width = Math.round(width * density); drawing!.height = Math.round(height * density);
      ctx!.setTransform(density, 0, 0, density, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      const scale = height / Math.max(1, scroll!.scrollHeight);
      const textWidth = Math.max(10, width - 10);
      const style = getComputedStyle(map!);
      const strength = parseFloat(style.getPropertyValue('--word-strength')) / 100;
      const palette = new Map(words.map(word => [word.term, `rgb(${[1, 3, 5].map(start => Math.round(parseInt(word.color.slice(start, start + 2), 16) * strength + 255 * (1 - strength))).join(',')})`]));
      ctx!.fillStyle = style.getPropertyValue('--minimap-line');
      for (const line of lines) ctx!.fillRect(5, Math.round(line.y * scale), line.width * textWidth, 1);
      for (const hit of hits) {
        const colors = words.filter(word => hit.terms.includes(word.term));
        const y = Math.round(hit.y * scale), markWidth = Math.min(textWidth, Math.max(3, colors.length * 2, hit.width * textWidth));
        const x = Math.min(width - 5 - markWidth, 5 + hit.x * textWidth);
        colors.forEach((word, index) => {
          ctx!.fillStyle = palette.get(word.term)!;
          ctx!.fillRect(x + index * markWidth / colors.length, y - 1, markWidth / colors.length, 2);
        });
        if (hit.id === active) {
          ctx!.strokeStyle = style.getPropertyValue('--match-outline'); ctx!.lineWidth = 1;
          ctx!.strokeRect(x - 1.5, y - 2.5, markWidth + 3, 5);
        }
      }
      updateViewport();
    }
    function measure() {
      const offset = scroll!.scrollTop - scroll!.getBoundingClientRect().top;
      lines = []; hits = [];
      const range = document.createRange();
      for (const paragraph of text!.querySelectorAll<HTMLParagraphElement>('p')) {
        const bounds = paragraph.getBoundingClientRect();
        range.selectNodeContents(paragraph);
        const rows = new Map<number, number>();
        for (const rect of range.getClientRects()) {
          if (rect.width <= 0 || rect.height <= 0) continue;
          const y = Math.round(rect.top + rect.height / 2 + offset);
          rows.set(y, Math.max(rows.get(y) ?? 0, Math.min(1, (rect.right - bounds.left) / Math.max(1, bounds.width))));
        }
        for (const [y, width] of rows) lines.push({ y, width });
        for (const mark of paragraph.querySelectorAll<HTMLElement>('mark[data-hit-id]')) {
          const rect = mark.getClientRects()[0]; if (!rect) continue;
          hits.push({ id: mark.dataset.hitId!, y: rect.top + rect.height / 2 + offset,
            x: Math.max(0, (rect.left - bounds.left) / Math.max(1, bounds.width)), width: rect.width / Math.max(1, bounds.width), terms: mark.dataset.terms!.split(' ') });
        }
      }
      paint();
    }
    function queue() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); }); }
    scroll.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateViewport(); });
    }, { passive: true, signal });
    const observer = new ResizeObserver(queue); observer.observe(text); observer.observe(map);
    window.addEventListener('resize', queue, { signal });
    // Re-arm when moving between displays with different pixel densities.
    let densityQuery: MediaQueryList;
    function densityChanged() {
      densityQuery?.removeEventListener('change', densityChanged);
      densityQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      densityQuery.addEventListener('change', densityChanged, { once: true }); queue();
    }
    densityChanged();
    const themeObserver = new MutationObserver(paint);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const point = (event: PointerEvent) => Math.max(0, Math.min(map.clientHeight, event.clientY - map.getBoundingClientRect().top));
    map.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return;
      const y = point(event), target = y / Math.max(1, map.clientHeight) * scroll.scrollHeight;
      const offset = target - scroll.scrollTop;
      drag = { id: event.pointerId, start: y, moved: false, offset: offset >= 0 && offset <= scroll.clientHeight ? offset : scroll.clientHeight / 2 };
      map.setPointerCapture(event.pointerId); map.focus({ preventScroll: true });
    }, { signal });
    map.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const y = point(event); drag.moved ||= Math.abs(y - drag.start) > 3;
      if (drag.moved) scrollTo(y / Math.max(1, map.clientHeight) * scroll.scrollHeight - drag.offset, true);
    }, { signal });
    map.addEventListener('pointerup', event => {
      if (drag?.id !== event.pointerId) return;
      if (!drag.moved) {
        const y = point(event) / Math.max(1, map.clientHeight) * scroll.scrollHeight;
        const tolerance = 6 / Math.max(1, map.clientHeight) * scroll.scrollHeight;
        const nearest = hits.reduce<Hit | undefined>((best, hit) => Math.abs(hit.y - y) < Math.min(tolerance, best ? Math.abs(best.y - y) : Infinity) ? hit : best, undefined);
        if (nearest) onHit(nearest.id); else scrollTo(y - scroll.clientHeight / 2);
      }
      drag = undefined;
    }, { signal });
    for (const event of ['pointercancel', 'lostpointercapture'] as const) map.addEventListener(event, () => { drag = undefined; }, { signal });
    map.addEventListener('keydown', event => {
      const y = scroll.scrollTop, page = Math.max(80, scroll.clientHeight - 36);
      const targets: Record<string, number> = { Home: 0, End: scroll.scrollHeight, ArrowUp: y - 76, ArrowDown: y + 76, PageUp: y - page, PageDown: y + page };
      if (Object.hasOwn(targets, event.key)) { event.preventDefault(); scrollTo(targets[event.key], true); }
    }, { signal });
    queue();
    return () => { events.abort(); observer.disconnect(); themeObserver.disconnect(); densityQuery?.removeEventListener('change', densityChanged); cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); };
  }, [scroller, transcript, words, active, onHit]);
  return <aside className="transcript-minimap" aria-label="Fundstellenübersicht">
    <div className="map-surface" ref={surface} role="scrollbar" tabIndex={0} aria-label="Position im Transkript" aria-controls={controls} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <canvas ref={canvas} aria-hidden="true" /><div className="map-thumb" ref={thumb} aria-hidden="true" />
    </div>
  </aside>;
}

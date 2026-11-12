import type { ReactNode } from 'react';
import type { Highlight } from './search';
import { wordStyle } from './word-colors';
export type ColoredTerm = { term: string; label: string; color: string };
export function HighlightedText({ text, highlights, words, from = 0, to = text.length, segmentId }: {
  text: string; highlights: Highlight[]; words: ColoredTerm[]; from?: number; to?: number; segmentId?: string;
}) {
  const pieces: ReactNode[] = []; let cursor = from;
  for (const range of highlights) {
    if (range.start < from || range.end > to) continue;
    pieces.push(text.slice(cursor, range.start));
    const colors = range.terms.map(term => words.find(word => word.term === term)?.color).filter((color): color is string => !!color);
    const background = colors.length > 1 ? `linear-gradient(180deg, ${colors.map((color, index) => `${color}33 ${index * 100 / colors.length}%, ${color}33 ${(index + 1) * 100 / colors.length}%`).join(', ')})` : undefined;
    pieces.push(<mark key={range.start} data-hit-id={segmentId ? `${segmentId}:${range.start}` : undefined} data-terms={range.terms.join(' ')} title={range.terms.map(term => words.find(word => word.term === term)?.label ?? term).join(', ')} style={{ ...wordStyle(colors[0]), background }}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  }
  pieces.push(text.slice(cursor, to));
  return <>{pieces}</>;
}

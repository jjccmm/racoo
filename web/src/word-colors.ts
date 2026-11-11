import type { CSSProperties } from 'react';

// Carbon categorical sequence, shared by the word explorer and its introduction.
export const WORD_COLORS = ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56', '#8a3800', '#198038', '#002d9c', '#a56eff', '#570408'] as const;

export function wordStyle(color: string): CSSProperties {
  const linear = [1, 3, 5].map((start) => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const ink = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
  return { '--word-color': color, '--word-ink': ink } as CSSProperties;
}

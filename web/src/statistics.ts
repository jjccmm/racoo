/** Episode indices are positions in this publication's statistics catalog only. */
export function countPairs(value: unknown, episodeCount: number): [number, number][] {
  if (!Array.isArray(value)) throw new Error('Invalid lemma counts');
  const seen = new Set<number>();
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length !== 2
        || !Number.isSafeInteger(pair[0]) || pair[0] < 0 || pair[0] >= episodeCount
        || !Number.isSafeInteger(pair[1]) || pair[1] <= 0 || seen.has(pair[0])) {
      throw new Error('Invalid lemma counts');
    }
    seen.add(pair[0]);
  }
  return value as [number, number][];
}

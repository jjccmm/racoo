export const wordPattern = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[-/][\p{L}\p{M}\p{N}]+)*/gu;
export const normalizeWord = (word: string) => word.normalize('NFC').toLocaleLowerCase('de-DE');

export function parseQuery(query: string) {
  if (query.length > 250) throw new Error('Bitte verwende höchstens 250 Zeichen.');
  const labels = new Map<string, string>();
  for (const word of query.match(wordPattern) ?? []) {
    const term = normalizeWord(word);
    if (!labels.has(term)) labels.set(term, word);
  }
  const terms = [...labels.keys()];
  if (terms.length > 10) throw new Error('Bitte suche mit höchstens zehn unterschiedlichen Stichwörtern.');
  return { terms, labels: Object.fromEntries(labels) };
}

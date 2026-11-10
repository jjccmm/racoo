export function parseQuery(query: string, excluded: readonly string[] = []) {
  if (query.length > 250) throw new Error('Bitte verwende höchstens 250 Zeichen.');
  const words = [...new Set(query.normalize('NFC').toLocaleLowerCase('de-DE')
    .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[-/][\p{L}\p{M}\p{N}]+)*/gu) ?? [])];
  const ignored = words.filter(word => excluded.includes(word));
  const terms = words.filter(word => !excluded.includes(word));
  if (terms.length > 5) throw new Error('Bitte suche mit höchstens fünf unterschiedlichen Stichwörtern.');
  return { terms, ignored };
}

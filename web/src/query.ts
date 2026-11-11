export function parseQuery(query: string) {
  if (query.length > 250) throw new Error('Bitte verwende höchstens 250 Zeichen.');
  const terms = [...new Set(query.normalize('NFC').toLocaleLowerCase('de-DE')
    .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[-/][\p{L}\p{M}\p{N}]+)*/gu) ?? [])];
  if (terms.length > 10) throw new Error('Bitte suche mit höchstens zehn unterschiedlichen Stichwörtern.');
  return { terms };
}

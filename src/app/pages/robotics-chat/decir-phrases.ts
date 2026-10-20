export interface Phrase {
  id: number;
  title: string;
  text: string;
  icon: string;
  active: boolean;
}

export interface PhraseCatalog {
  items: Phrase[];
}

export function sortPhrasesNewestFirst(items: Phrase[]): Phrase[] {
  return [...items].sort((left, right) => right.id - left.id);
}

export function filterSpeakPhrases(items: Phrase[], query: string): Phrase[] {
  const needle = query.trim().toLowerCase();
  const active = items.filter((item) => item.active);
  const matched = needle
    ? active.filter(
        (item) =>
          item.title.toLowerCase().includes(needle) || item.text.toLowerCase().includes(needle),
      )
    : active;
  return sortPhrasesNewestFirst(matched);
}

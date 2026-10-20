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

export function filterSpeakPhrases(items: Phrase[], query: string): Phrase[] {
  const needle = query.trim().toLowerCase();
  const active = items.filter((item) => item.active);
  if (!needle) return active;
  return active.filter(
    (item) => item.title.toLowerCase().includes(needle) || item.text.toLowerCase().includes(needle),
  );
}

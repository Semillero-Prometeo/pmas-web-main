export const CATEGORY_ORDER = [
  'cara',
  'cuello',
  'brazo_derecho',
  'brazo_izquierdo',
  'torso',
  'cadera',
] as const;

export type SequenceCategory = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<SequenceCategory, string> = {
  cara: 'Cara',
  cuello: 'Cuello',
  brazo_derecho: 'Brazo derecho',
  brazo_izquierdo: 'Brazo izquierdo',
  torso: 'Torso',
  cadera: 'Cadera',
};

export const CATEGORY_ICONS: Record<SequenceCategory, string> = {
  cara: 'sentiment_satisfied',
  cuello: 'accessibility_new',
  brazo_derecho: 'back_hand',
  brazo_izquierdo: 'front_hand',
  torso: 'accessibility',
  cadera: 'directions_walk',
};

export interface PlayableSequence {
  name: string;
  description: string;
  category: SequenceCategory | null | undefined;
  blocks: unknown[];
  blocks_neutro: unknown[];
}

export function isPlayableSequence(sequence: PlayableSequence): boolean {
  return (
    CATEGORY_ORDER.includes(sequence.category as SequenceCategory) &&
    Array.isArray(sequence.blocks) &&
    sequence.blocks.length > 0
  );
}

export function hasNeutroTrack(sequence: { blocks_neutro?: unknown[] }): boolean {
  return Array.isArray(sequence.blocks_neutro) && sequence.blocks_neutro.length > 0;
}

export function groupByCategory(sequences: PlayableSequence[]) {
  return CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    sequences: sequences
      .filter((item) => item.category === key && isPlayableSequence(item))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

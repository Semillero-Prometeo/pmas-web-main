import { describe, expect, it } from 'vitest';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_ORDER, groupByCategory, isPlayableSequence } from './sequence-groups';

const saludo = {
  name: 'saludo',
  description: 'Saludo con el brazo derecho',
  category: 'brazo_derecho' as const,
  blocks: [{ pos: 1 }],
  blocks_neutro: [{ pos: 2 }],
};

describe('sequence groups', () => {
  it('keeps the six body sections in spec order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'cara',
      'cuello',
      'brazo_derecho',
      'brazo_izquierdo',
      'torso',
      'cadera',
    ]);
    expect(CATEGORY_LABELS.brazo_derecho).toBe('Brazo derecho');
    expect(CATEGORY_ICONS.cara).toBe('sentiment_satisfied');
    expect(Object.keys(CATEGORY_ICONS)).toEqual([...CATEGORY_ORDER]);
  });

  it('hides legacy files without a pair', () => {
    expect(
      isPlayableSequence({
        name: 'legado',
        description: '',
        category: null,
        blocks: [{ pos: 1 }],
        blocks_neutro: [],
      }),
    ).toBe(false);
    expect(isPlayableSequence(saludo)).toBe(true);
  });

  it('puts playable sequences in the six sections', () => {
    const groups = groupByCategory([saludo]);
    expect(groups.map((item) => item.key)).toEqual(CATEGORY_ORDER);
    expect(groups[2].label).toBe('Brazo derecho');
    expect(groups[2].sequences[0].name).toBe('saludo');
    expect(groups[0].sequences).toEqual([]);
  });
});

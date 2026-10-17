import { describe, expect, it } from 'vitest';
import { hasNeutroTrack, isPlayableSequence } from './sequence-groups';

const base = {
  name: 'abrazo',
  description: '',
  category: 'brazo_izquierdo' as const,
  blocks: [{}],
  blocks_neutro: [],
};

describe('panel sequences', () => {
  it('is playable without neutro', () => {
    expect(isPlayableSequence(base)).toBe(true);
    expect(hasNeutroTrack(base)).toBe(false);
  });

  it('has neutro when the track is not empty', () => {
    expect(hasNeutroTrack({ ...base, blocks_neutro: [{}] })).toBe(true);
  });
});

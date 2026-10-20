import { describe, expect, it } from 'vitest';
import { filterSpeakPhrases, type Phrase } from './decir-phrases';

const items: Phrase[] = [
  { id: 1, title: 'Saludo Patria', text: 'Saludos colegio', icon: '', active: true },
  { id: 2, title: 'Hasta la vista', text: 'beibi', icon: 'waving_hand', active: false },
  { id: 3, title: 'Stand', text: 'pabellón 3', icon: 'location_on', active: true },
];

describe('filterSpeakPhrases', () => {
  it('hides inactive phrases', () => {
    expect(filterSpeakPhrases(items, '').map((item) => item.id)).toEqual([1, 3]);
  });

  it('matches title or text', () => {
    expect(filterSpeakPhrases(items, 'pabellón').map((item) => item.id)).toEqual([3]);
    expect(filterSpeakPhrases(items, 'patria').map((item) => item.id)).toEqual([1]);
  });
});

import { describe, expect, it } from 'vitest';
import { parseOriginText } from './origin-sequence';

describe('parseOriginText', () => {
  it('reads origin pair', () => {
    const parsed = parseOriginText(
      JSON.stringify({
        name: 'saludo',
        description: 'Saludo con el brazo derecho',
        category: 'brazo_derecho',
        blocks: [[0, 0, 0.0, 2, 850, 5, 'P0_S0']],
        blocks_neutro: [[0, 0, 0.0, 2, 500, 5, 'P0_S0']],
      }),
      'archivo',
      1,
    );
    expect(parsed.error).toBeNull();
    expect(parsed.category).toBe('brazo_derecho');
    expect(parsed.blocksNeutro[0][4]).toBe(500);
  });

  it('rejects missing category or neutro', () => {
    const parsed = parseOriginText(
      JSON.stringify({
        name: 'saludo',
        blocks: [[0, 0, 0.0, 2, 0, 1, 'P0_S0']],
      }),
      'archivo',
      1,
    );
    expect(parsed.error).toMatch(/categor[ií]a|neutro/i);
  });

  it('rejects raw 7-tuple list', () => {
    const parsed = parseOriginText(JSON.stringify([[0, 0, 0.0, 2, 0, 1, 'P0_S0']]), 'viejo', 0);
    expect(parsed.error).toBeTruthy();
  });

  it('rejects neither-list-nor-origin', () => {
    const parsed = parseOriginText('{"foo": 1}', 'x', 0);
    expect(parsed.error).toBeTruthy();
  });
});

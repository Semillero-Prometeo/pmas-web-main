import { describe, expect, it } from 'vitest';
import { parseOriginText } from './origin-sequence';

describe('parseOriginText', () => {
  it('reads origin wrapper', () => {
    const parsed = parseOriginText(
      JSON.stringify({
        name: 'saludo',
        description: 'Saludo con el brazo derecho',
        blocks: [[0, 0, 0.0, 2, 0, 1, 'P0_S0']],
      }),
      'archivo',
      1,
    );
    expect(parsed.error).toBeNull();
    expect(parsed.name).toBe('saludo');
    expect(parsed.description).toBe('Saludo con el brazo derecho');
    expect(parsed.blocks).toEqual([[0, 0, 0.0, 2, 0, 1, 'P0_S0']]);
  });

  it('reads raw 7-tuple list with empty description', () => {
    const parsed = parseOriginText(
      JSON.stringify([[0, 0, 0.0, 2, 0, 1, 'P0_S0']]),
      'viejo',
      0,
    );
    expect(parsed.error).toBeNull();
    expect(parsed.name).toBe('viejo');
    expect(parsed.description).toBe('');
  });

  it('rejects neither-list-nor-origin', () => {
    const parsed = parseOriginText('{"foo": 1}', 'x', 0);
    expect(parsed.error).toBeTruthy();
  });
});

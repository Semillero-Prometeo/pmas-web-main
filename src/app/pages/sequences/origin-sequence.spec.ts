import { describe, expect, it } from 'vitest';
import { generateNeutroFrom, parseOriginText, shouldSkipLegacyNeutroFile } from './origin-sequence';

const ABRAZOIZQ: [number, number, number, number, number, number, string][] = [
  [1, 14, 0.0, 2, 650, 3, 'P0_S1'],
  [1, 13, 1.99, 2, 900, 3, 'P0_S2'],
  [1, 12, 4.0, 2, 500, 3, 'P0_S3'],
];

describe('parseOriginText', () => {
  it('reads a Qt 7-tuple list and generates neutro', () => {
    const parsed = parseOriginText(JSON.stringify(ABRAZOIZQ), 'ABRAZOIZQ 7.1', 0);
    expect(parsed.error).toBeNull();
    expect(parsed.name).toBe('ABRAZOIZQ 7.1');
    expect(parsed.description).toBe('');
    expect(parsed.category).toBeNull();
    expect(parsed.blocks).toEqual(ABRAZOIZQ);
    expect(parsed.blocksNeutro.length).toBeGreaterThan(0);
    expect(parsed.blocksNeutro).not.toEqual(parsed.blocks);
  });

  it('keeps an origin pair without regenerating neutro', () => {
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
    expect(parsed.blocksNeutro).toEqual([[0, 0, 0.0, 2, 500, 5, 'P0_S0']]);
  });

  it('generates neutro when origin has blocks but no neutro track', () => {
    const parsed = parseOriginText(
      JSON.stringify({
        name: 'saludo',
        blocks: [[0, 0, 0.0, 2, 850, 5, 'P0_S0']],
      }),
      'archivo',
      1,
    );
    expect(parsed.error).toBeNull();
    expect(parsed.blocksNeutro.length).toBeGreaterThan(0);
  });

  it('rejects neither-list-nor-origin', () => {
    const parsed = parseOriginText('{"foo": 1}', 'x', 0);
    expect(parsed.error).toBeTruthy();
  });
});

describe('shouldSkipLegacyNeutroFile', () => {
  it('skips companion NEUTRO names', () => {
    expect(shouldSkipLegacyNeutroFile('ABRAZOIZQ NEUTRO 7.1')).toBe(true);
    expect(shouldSkipLegacyNeutroFile('brazoizq con guino neutro 7.0')).toBe(true);
    expect(shouldSkipLegacyNeutroFile('ABRAZOIZQ 7.1')).toBe(false);
  });
});

describe('generateNeutroFrom', () => {
  it('rewinds the first pose of each servo', () => {
    const neutro = generateNeutroFrom([[0, 0, 0.0, 2, 850, 5, 'P0_S0']]);
    expect(neutro[0][4]).toBe(0);
    expect(neutro[0][2]).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { isNeutroFileName, pairKey, suggestNeutroPath } from './origin-pair';

describe('origin-pair', () => {
  it('matches ABRAZOIZQ 7.1 with ABRAZOIZQ NEUTRO 7.1', () => {
    expect(pairKey('ABRAZOIZQ 7.1')).toBe(pairKey('ABRAZOIZQ NEUTRO 7.1'));
    expect(suggestNeutroPath('ABRAZOIZQ 7.1', ['ABRAZOIZQ NEUTRO 7.1'])).toBe('ABRAZOIZQ NEUTRO 7.1');
  });

  it('does not match 7.3 with NEUTRO 7.0', () => {
    expect(pairKey('BRAZOIZQ CON GUINO 7.3')).not.toBe(pairKey('BRAZOIZQ CON GUINO NEUTRO 7.0'));
    expect(suggestNeutroPath('BRAZOIZQ CON GUINO 7.3', ['BRAZOIZQ CON GUINO NEUTRO 7.0'])).toBeNull();
  });

  it('detects NEUTRO names', () => {
    expect(isNeutroFileName('ABRAZOIZQ NEUTRO 7.1')).toBe(true);
    expect(isNeutroFileName('ABRAZOIZQ 7.1')).toBe(false);
  });
});

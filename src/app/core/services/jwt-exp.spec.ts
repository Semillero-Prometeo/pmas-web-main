import { describe, expect, it } from 'vitest';
import { tokenIsUnexpired } from './jwt-exp';

function jwtWithExp(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `hdr.${payload}.sig`;
}

describe('tokenIsUnexpired', () => {
  it('is true when exp is in the future', () => {
    expect(tokenIsUnexpired(jwtWithExp(2_000_000_000), 1_700_000_000_000)).toBe(true);
  });

  it('is false when exp is in the past', () => {
    expect(tokenIsUnexpired(jwtWithExp(1_000_000_000), 1_700_000_000_000)).toBe(false);
  });

  it('is false for malformed tokens', () => {
    expect(tokenIsUnexpired('not-a-jwt')).toBe(false);
    expect(tokenIsUnexpired('a.b')).toBe(false);
  });
});

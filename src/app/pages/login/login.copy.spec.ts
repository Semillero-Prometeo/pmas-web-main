import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(import.meta.dirname, 'login.html'), 'utf8');

describe('login operator copy', () => {
  it('uses green rail and readable type, not theater stats', () => {
    expect(html).toContain('Mesa de control de R-ONE');
    expect(html).toContain('Elige tu rol');
    expect(html).toContain('bg-rail');
    expect(html).not.toContain('Uptime');
    expect(html).not.toContain('Bit Encryption');
    expect(html).not.toContain('text-[10px]');
    expect(html).not.toContain('text-[9px]');
    expect(html).not.toContain('text-slate-');
    expect(html).not.toContain('text-blue-400');
  });

  it('tells the operator when the session expired', () => {
    expect(html).toContain('Tu sesión venció. Entra de nuevo.');
    expect(html).toContain('sessionExpired');
    expect(html).toContain('schedule');
  });
});

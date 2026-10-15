import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(import.meta.dirname, 'sidebar.ts'), 'utf8');
const html = readFileSync(resolve(import.meta.dirname, 'sidebar.html'), 'utf8');

describe('sidebar ADMIN gate', () => {
  it('hides autenticacion and gestion unless ADMIN', () => {
    expect(ts).toContain('visibleGroups');
    expect(ts).toContain("activeRoleName() === 'ADMIN'");
    expect(html).toContain('visibleGroups()');
  });
});

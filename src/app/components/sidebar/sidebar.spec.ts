import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(import.meta.dirname, 'sidebar.ts'), 'utf8');
const html = readFileSync(resolve(import.meta.dirname, 'sidebar.html'), 'utf8');

describe('sidebar ADMIN gate', () => {
  it('shows only Usuarios under autenticacion and has no Gestión', () => {
    expect(ts).toContain("activeRoleName() === 'ADMIN'");
    expect(ts).toContain("g.id !== 'autenticacion'");
    expect(ts).not.toContain("id: 'gestion'");
    expect(ts).not.toContain("id: 'roles'");
    expect(ts).not.toContain('/admin/roles');
    expect(ts).not.toContain('/admin/management');
    expect(html).toContain('visibleGroups()');
  });
});

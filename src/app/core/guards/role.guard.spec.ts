import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const guard = readFileSync(resolve(import.meta.dirname, 'role.guard.ts'), 'utf8');
const routes = readFileSync(resolve(import.meta.dirname, '../../app.routes.ts'), 'utf8');

describe('roleGuard ADMIN', () => {
  it('is on users route and checks ADMIN', () => {
    expect(guard).toContain("activeRoleName() === 'ADMIN'");
    expect(guard).toContain('/control-panel');
    expect(routes).toContain('roleGuard');
    expect(routes).toMatch(/admin\/users[\s\S]{0,400}roleGuard/);
    expect(routes).not.toContain('admin/roles');
  });
});

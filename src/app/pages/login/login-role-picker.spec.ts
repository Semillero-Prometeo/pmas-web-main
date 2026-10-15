import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(import.meta.dirname, 'login.ts'), 'utf8');

describe('login role picker', () => {
  it('opens the picker only when needsRoleSelection is true', () => {
    expect(ts).toContain('needsRoleSelection');
    expect(ts).not.toContain('availableRoles().length === 0');
  });
});

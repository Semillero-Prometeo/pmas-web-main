import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(import.meta.dirname, 'users.ts'), 'utf8');
const html = readFileSync(resolve(import.meta.dirname, 'users.html'), 'utf8');

describe('users admin CRUD', () => {
  it('sends person and never /auth/users', () => {
    expect(ts).toContain('${GATEWAY_URL}/users');
    expect(ts).toContain('/users/inactive');
    expect(ts).not.toContain('/auth/users');
    expect(ts).toContain('person:');
    expect(ts).toContain('first_name');
    expect(ts).toContain('document_number');
    expect(ts).toContain('/document-types');
    expect(ts).toContain('take=50');
    expect(html).toContain('first_name');
    expect(html).toContain('autocomplete="new-password"');
    expect(html).toContain('Dar de baja');
    expect(html).not.toContain('industrial-grid');
    expect(html).not.toContain('text-slate-');
    expect(html).not.toContain('text-[9px]');
    expect(html).not.toContain('text-[10px]');
  });
});

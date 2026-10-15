import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(import.meta.dirname, 'users.ts'), 'utf8');
const html = readFileSync(resolve(import.meta.dirname, 'users.html'), 'utf8');

describe('users admin CRUD', () => {
  it('calls gateway /users and never /auth/users', () => {
    expect(ts).toContain('${GATEWAY_URL}/users');
    expect(ts).toContain('http.put');
    expect(ts).toContain('/users/inactive');
    expect(ts).not.toContain('/auth/users');
    expect(ts).toContain('role_ids');
    expect(html).not.toContain('first_name');
    expect(html).not.toContain('last_name');
  });
});

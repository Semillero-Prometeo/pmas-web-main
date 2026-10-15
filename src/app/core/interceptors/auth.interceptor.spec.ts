import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(import.meta.dirname, 'auth.interceptor.ts'), 'utf8');

describe('auth interceptor session close', () => {
  it('closes on any 401 or 403 except public auth URLs', () => {
    expect(src).toContain("logout('expired')");
    expect(src).toContain('/auth/login');
    expect(src).toContain('/auth/restore-password');
    expect(src).toContain('/auth/set-password');
    expect(src).not.toContain('INACTIVE_SESSION_MESSAGE');
    expect(src).not.toContain('shouldLogoutOn401');
  });
});

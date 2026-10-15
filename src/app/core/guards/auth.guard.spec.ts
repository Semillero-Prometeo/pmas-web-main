import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(import.meta.dirname, 'auth.guard.ts'), 'utf8');
const shell = readFileSync(resolve(import.meta.dirname, '../../layouts/admin-shell/admin-shell.ts'), 'utf8');

describe('authGuard expired session', () => {
  it('logs out expired tokens instead of keeping the shell', () => {
    expect(src).toContain("logout('expired')");
    expect(src).toContain('isAuthenticated');
  });

  it('loads the profile in the admin shell after refresh', () => {
    expect(shell).toContain('loadProfile');
    expect(shell).toContain('AuthService');
  });
});

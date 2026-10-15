import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(import.meta.dirname, 'vision-websocket.service.ts'), 'utf8');

describe('vision websocket auth close', () => {
  it('closes the Angular session on 4001', () => {
    expect(src).toContain('4001');
    expect(src).toContain("logout('expired')");
  });
});

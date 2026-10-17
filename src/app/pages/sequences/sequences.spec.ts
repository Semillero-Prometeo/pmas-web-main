import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ts = readFileSync(resolve(__dirname, 'sequences.ts'), 'utf8');
const html = readFileSync(resolve(__dirname, 'sequences.html'), 'utf8');

describe('legacy import modal', () => {
  it('requires a category and skips NEUTRO files', () => {
    expect(ts).toContain('shouldSkipLegacyNeutroFile');
    expect(ts).toContain('updateLegacyItemCategory');
    expect(ts).toMatch(/item\.category/);
    expect(html).toContain('updateLegacyItemCategory');
    expect(html).toMatch(/Categor[ií]a/);
  });
});

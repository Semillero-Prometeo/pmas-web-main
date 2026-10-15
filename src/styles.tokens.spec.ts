import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, 'styles.css'), 'utf8');
const html = readFileSync(resolve(import.meta.dirname, 'index.html'), 'utf8');

function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]+)`));
  if (!match) throw new Error(`missing token ${name}`);
  return match[1].toLowerCase();
}

describe('light dashboard tokens', () => {
  it('uses the approved light surfaces and ink', () => {
    expect(token('--color-background')).toBe('#f4f7fb');
    expect(token('--color-surface')).toBe('#ffffff');
    expect(token('--color-surface-container')).toBe('#ffffff');
    expect(token('--color-surface-container-high')).toBe('#eef2f6');
    expect(token('--color-on-surface')).toBe('#0f172a');
    expect(token('--color-on-surface-variant')).toBe('#475569');
    expect(token('--color-outline')).toBe('#cbd5e1');
  });

  it('keeps Prometeo cyan and emerald and uses a light error', () => {
    expect(token('--color-primary')).toBe('#38bdf8');
    expect(token('--color-secondary')).toBe('#10b981');
    expect(token('--color-error')).toBe('#dc2626');
    expect(token('--color-error-container')).toBe('#fee2e2');
    expect(token('--color-primary-container')).toBe('#e0f2fe');
    expect(css).not.toMatch(/--color-error-container:\s*#93000a/);
    expect(css).not.toMatch(/--color-background:\s*#000f1d/);
  });

  it('restyles industrial-grid to faint light dots', () => {
    expect(css).toMatch(/\.industrial-grid\s*\{[^}]*#cbd5e1/s);
    expect(css).not.toMatch(/\.industrial-grid\s*\{[^}]*#43474f/s);
  });

  it('drops the html dark class', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).not.toMatch(/class="dark"/);
  });
});

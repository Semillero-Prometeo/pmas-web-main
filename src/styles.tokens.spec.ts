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
  it('uses mint work surfaces and forest ink, never pure white', () => {
    expect(token('--color-background')).toBe('#c5e6d4');
    expect(token('--color-surface')).toBe('#f3faf5');
    expect(token('--color-surface-container')).toBe('#f3faf5');
    expect(token('--color-surface-container-high')).toBe('#d9efe3');
    expect(token('--color-on-surface')).toBe('#10241c');
    expect(token('--color-on-surface-variant')).toBe('#2a5644');
    expect(token('--color-outline')).toBe('#7fb59a');
    expect(css).not.toMatch(/--color-background:\s*#ffffff/);
    expect(css).not.toMatch(/--color-surface:\s*#ffffff/);
    expect(css).not.toMatch(/--color-on-surface-variant:\s*#475569/);
  });

  it('keeps Prometeo cyan action, emerald secondary, and a forest rail', () => {
    expect(token('--color-primary')).toBe('#38bdf8');
    expect(token('--color-secondary')).toBe('#059669');
    expect(token('--color-rail')).toBe('#065f46');
    expect(token('--color-on-rail')).toBe('#ecf8f1');
    expect(token('--color-error')).toBe('#dc2626');
    expect(token('--color-warning')).toBe('#b45309');
    expect(css).not.toMatch(/--color-error-container:\s*#93000a/);
    expect(css).not.toMatch(/--color-background:\s*#000f1d/);
  });

  it('restyles industrial-grid to faint mint dots', () => {
    expect(css).toMatch(/\.industrial-grid\s*\{[^}]*#7fb59a/s);
    expect(css).not.toMatch(/\.industrial-grid\s*\{[^}]*#43474f/s);
  });

  it('drops the html dark class', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).not.toMatch(/class="dark"/);
  });
});

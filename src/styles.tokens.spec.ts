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

describe('navy chrome tokens', () => {
  it('uses cool paper and navy ink, never pure white or forest canvas', () => {
    expect(token('--color-background')).toBe('#eef2f6');
    expect(token('--color-surface')).toBe('#f7fafc');
    expect(token('--color-surface-container')).toBe('#f7fafc');
    expect(token('--color-on-surface')).toBe('#0b2540');
    expect(token('--color-on-surface-variant')).toBe('#3d5a73');
    expect(token('--color-outline')).toBe('#c5d4e0');
    expect(css).not.toMatch(/--color-background:\s*#ffffff/);
    expect(css).not.toMatch(/--color-surface:\s*#ffffff/);
    expect(css).not.toMatch(/--color-background:\s*#c5e6d4/);
    expect(css).not.toMatch(/--color-on-surface-variant:\s*#2a5644/);
    expect(css).not.toMatch(/--color-on-surface-variant:\s*#475569/);
  });

  it('keeps cyan action, emerald secondary, and a navy rail', () => {
    expect(token('--color-primary')).toBe('#38bdf8');
    expect(token('--color-secondary')).toBe('#059669');
    expect(token('--color-rail')).toBe('#0b2540');
    expect(token('--color-on-rail')).toBe('#eef2f6');
    expect(token('--color-chrome')).toBe('#0b2540');
    expect(token('--color-on-chrome')).toBe('#eef2f6');
    expect(token('--color-error')).toBe('#dc2626');
    expect(token('--color-warning')).toBe('#b45309');
    expect(css).not.toMatch(/--color-rail:\s*#065f46/);
    expect(css).not.toMatch(/--color-background:\s*#000f1d/);
  });

  it('restyles industrial-grid to faint cool dots', () => {
    expect(css).toMatch(/\.industrial-grid\s*\{[^}]*#c5d4e0/s);
    expect(css).not.toMatch(/\.industrial-grid\s*\{[^}]*#7fb59a/s);
    expect(css).not.toMatch(/\.industrial-grid\s*\{[^}]*#43474f/s);
  });

  it('drops the html dark class', () => {
    expect(html).toMatch(/<html lang="es">/);
    expect(html).not.toMatch(/class="dark"/);
  });
});

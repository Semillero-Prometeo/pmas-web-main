import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(import.meta.dirname, 'hardware-runtime-drawer.html'), 'utf8');
const ts = readFileSync(resolve(import.meta.dirname, 'hardware-runtime-drawer.ts'), 'utf8');

describe('hardware runtime drawer copy', () => {
  it('is the Spanish hardware queue', () => {
    expect(html).toContain('En hardware');
    expect(html).toContain('Detener');
    expect(html).toContain('Nada pendiente.');
    expect(html).toContain('No hay estado del robot. Detener sigue disponible.');
    expect(html).not.toContain('System Override');
    expect(html).not.toContain('Execution Log');
  });

  it('always offers Detener and never uses arbitrary px text', () => {
    expect(html).toContain('stopHardware()');
    expect(html).not.toMatch(/stopHardware\(\)"[\s\S]*disabled/);
    expect(html).not.toMatch(/text-\[\d+px\]/);
    expect(ts).toContain('HardwareRuntimeService');
  });
});

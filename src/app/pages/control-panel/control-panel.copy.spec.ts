import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(import.meta.dirname, 'control-panel.html'), 'utf8');
const ts = readFileSync(resolve(import.meta.dirname, 'control-panel.ts'), 'utf8');

describe('control panel dashboard copy', () => {
  it('is a Spanish operator dashboard', () => {
    expect(html).toContain('Panel de control');
    expect(html).toContain('Registro');
    expect(html).toContain('En hardware');
    expect(html).toContain('kpis().estado');
    expect(html).toContain('kpis().origen');
    expect(html).toContain('kpis().secuencias');
    expect(html).toContain('kpis().ultimoEvento');
    expect(html).not.toContain('System Override');
    expect(html).not.toContain('0x4F22-ALPHA');
    expect(html).not.toContain('Robotic Control');
    expect(html).not.toContain('Execution Log');
    expect(html).not.toContain('Uptime');
    expect(html).not.toContain('Signal');
  });

  it('keeps the busy lock and always offers Detener', () => {
    expect(html).toMatch(/executePhase\(sequence\.name, 'normal'\)[\s\S]*\[disabled\]="playLocked\(\)"/);
    expect(html).toMatch(/executePhase\(sequence\.name, 'neutro'\)[\s\S]*\[disabled\]="playLocked\(\)"/);
    expect(html).toContain('stopHardware()');
    expect(html).not.toMatch(/stopHardware\(\)"[\s\S]*disabled/);
  });

  it('drops invented telemetry and night cards', () => {
    expect(ts).not.toContain('uptime = signal');
    expect(ts).not.toContain('cpuLoad');
    expect(ts).toContain('panelKpis');
    expect(html).not.toContain('shadow-xl');
    expect(html).not.toContain('border-white/');
    expect(html).not.toContain('slate-950');
  });
});

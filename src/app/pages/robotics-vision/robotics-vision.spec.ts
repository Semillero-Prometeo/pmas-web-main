import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(import.meta.dirname, 'robotics-vision.html'), 'utf8');
const ts = readFileSync(resolve(import.meta.dirname, 'robotics-vision.ts'), 'utf8');
const ws = readFileSync(resolve(import.meta.dirname, 'vision-websocket.service.ts'), 'utf8');

describe('vision objects-first layout', () => {
  it('shows objects before cameras and drops Preview', () => {
    const objectsAt = html.indexOf('Objetos observados');
    const camerasAt = html.indexOf('Cámaras');
    expect(objectsAt).toBeGreaterThan(-1);
    expect(camerasAt).toBeGreaterThan(objectsAt);
    expect(html).not.toContain('Preview');
    expect(html).not.toContain('text-slate-');
    expect(html).not.toContain('text-[9px]');
    expect(html).not.toContain('text-[10px]');
    expect(html).not.toContain('industrial-grid');
    expect(ts).not.toContain('previewSrc');
    expect(ws).toContain('thumbMaxWidth: 480');
    expect(ws).not.toContain('setSelection');
  });
});

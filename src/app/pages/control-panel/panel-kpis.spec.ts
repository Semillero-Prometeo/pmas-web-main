import { describe, expect, it } from 'vitest';
import { catalogSequenceCount, panelKpis, phaseLabel, sourceHint, PanelKpiInput } from './panel-kpis';

const base: PanelKpiInput = {
  runtimeUnreachable: false,
  busy: false,
  source: null,
  sequenceLoading: false,
  sequenceError: null,
  sequenceCount: 4,
  lastLog: null,
};

describe('panelKpis', () => {
  it('shows idle values', () => {
    expect(panelKpis(base)).toEqual({
      estado: 'libre',
      origen: '—',
      secuencias: '4',
      ultimoEvento: '—',
      estadoHint: 'Puedes lanzar un gesto',
      origenHint: 'Nadie está enviando',
    });
  });

  it('shows busy source from runtime', () => {
    expect(
      panelKpis({ ...base, busy: true, source: 'turno' }),
    ).toEqual({
      estado: 'ocupado',
      origen: 'turno',
      secuencias: '4',
      ultimoEvento: '—',
      estadoHint: 'Espera o pulsa Detener',
      origenHint: 'Voz o chat',
    });
  });

  it('shows sin estado when runtime is down', () => {
    expect(
      panelKpis({ ...base, runtimeUnreachable: true, busy: true, source: 'panel' }),
    ).toEqual({
      estado: 'sin estado',
      origen: '—',
      secuencias: '4',
      ultimoEvento: '—',
      estadoHint: 'Sin conexión con el robot',
      origenHint: 'Nadie está enviando',
    });
  });

  it('hides the count while loading or on error', () => {
    expect(panelKpis({ ...base, sequenceLoading: true }).secuencias).toBe('—');
    expect(panelKpis({ ...base, sequenceError: 'falló' }).secuencias).toBe('—');
  });

  it('formats the newest log as last event', () => {
    expect(
      panelKpis({
        ...base,
        lastLog: { timestamp: '18:01:02', sequenceName: 'saludo normal' },
      }).ultimoEvento,
    ).toBe('18:01:02 · saludo normal');
  });
});

describe('phaseLabel', () => {
  it('speaks Spanish for each hardware phase', () => {
    expect(phaseLabel('normal')).toBe('Gesto');
    expect(phaseLabel('neutro')).toBe('Neutro');
    expect(phaseLabel('espera')).toBe('Pausa de 1 s');
    expect(phaseLabel(null)).toBe('En reposo');
  });
});

describe('sourceHint', () => {
  it('explains who is sending', () => {
    expect(sourceHint('panel')).toBe('Este panel');
    expect(sourceHint(null)).toBe('Nadie está enviando');
  });
});

describe('catalogSequenceCount', () => {
  it('sums every category group and ignores later UI filters', () => {
    expect(
      catalogSequenceCount([
        { sequences: [{}, {}] },
        { sequences: [] },
        { sequences: [{}] },
      ]),
    ).toBe(3);
  });
});

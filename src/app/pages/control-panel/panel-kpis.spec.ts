import { describe, expect, it } from 'vitest';
import { catalogSequenceCount, panelKpis, PanelKpiInput } from './panel-kpis';

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

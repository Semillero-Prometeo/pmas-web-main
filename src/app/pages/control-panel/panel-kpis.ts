export type RuntimeSource = 'turno' | 'panel' | 'estudio' | null;

export interface PanelKpiInput {
  runtimeUnreachable: boolean;
  busy: boolean;
  source: RuntimeSource;
  sequenceLoading: boolean;
  sequenceError: string | null;
  sequenceCount: number;
  lastLog: { timestamp: string; sequenceName: string } | null;
}

export interface PanelKpis {
  estado: 'ocupado' | 'libre' | 'sin estado';
  origen: 'estudio' | 'panel' | 'turno' | '—';
  secuencias: string;
  ultimoEvento: string;
}

export function catalogSequenceCount(groups: { sequences: unknown[] }[]): number {
  return groups.reduce((total, group) => total + group.sequences.length, 0);
}

export function panelKpis(input: PanelKpiInput): PanelKpis {
  const estado: PanelKpis['estado'] = input.runtimeUnreachable
    ? 'sin estado'
    : input.busy
      ? 'ocupado'
      : 'libre';
  const origen: PanelKpis['origen'] = input.runtimeUnreachable
    ? '—'
    : input.source ?? '—';
  const secuencias =
    input.sequenceLoading || input.sequenceError ? '—' : String(input.sequenceCount);
  const ultimoEvento = input.lastLog
    ? `${input.lastLog.timestamp} · ${input.lastLog.sequenceName}`
    : '—';
  return { estado, origen, secuencias, ultimoEvento };
}

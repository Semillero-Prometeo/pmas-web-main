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
  estadoHint: string;
  origenHint: string;
}

export function catalogSequenceCount(groups: { sequences: unknown[] }[]): number {
  return groups.reduce((total, group) => total + group.sequences.length, 0);
}

export function phaseLabel(mode: string | null | undefined): string {
  switch (mode) {
    case 'normal':
      return 'Gesto';
    case 'neutro':
      return 'Neutro';
    case 'espera':
      return 'Pausa de 1 s';
    default:
      return 'En reposo';
  }
}

export function sourceHint(source: RuntimeSource): string {
  switch (source) {
    case 'turno':
      return 'Voz o chat';
    case 'panel':
      return 'Este panel';
    case 'estudio':
      return 'Estudio de movimiento';
    default:
      return 'Nadie está enviando';
  }
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
  const estadoHint =
    estado === 'libre'
      ? 'Puedes lanzar un gesto'
      : estado === 'ocupado'
        ? 'Espera o pulsa Detener'
        : 'Sin conexión con el robot';
  return {
    estado,
    origen,
    secuencias,
    ultimoEvento,
    estadoHint,
    origenHint: sourceHint(input.runtimeUnreachable ? null : input.source),
  };
}

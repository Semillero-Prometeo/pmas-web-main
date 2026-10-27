export interface RuntimeBlock {
  nombre: string;
  pca: number;
  servo: number;
  inicio: number;
  dur: number;
  pos: number;
  vel: number;
  fired: boolean;
}

export interface RuntimeStep {
  id: number | null;
  name: string;
  mode: 'normal' | 'neutro' | 'espera';
  source: 'turno' | 'panel' | 'estudio';
  duration_ms: number;
  remaining_ms: number;
  blocks: RuntimeBlock[];
}

export interface RuntimeSnapshot {
  busy: boolean;
  source: 'turno' | 'panel' | 'estudio' | null;
  current: RuntimeStep | null;
  queue: RuntimeStep[];
}

export interface RuntimeViewState {
  runtime: RuntimeSnapshot;
  drawerOpen: boolean;
  dismissedThisStreak: boolean;
}

export const IDLE_RUNTIME: RuntimeSnapshot = {
  busy: false,
  source: null,
  current: null,
  queue: [],
};

function asStep(raw: Partial<RuntimeStep> | null | undefined): RuntimeStep | null {
  if (!raw || typeof raw.name !== 'string') return null;
  const mode = raw.mode === 'neutro' || raw.mode === 'espera' ? raw.mode : 'normal';
  const source = raw.source === 'panel' || raw.source === 'estudio' ? raw.source : 'turno';
  return {
    id: raw.id ?? null,
    name: raw.name,
    mode,
    source,
    duration_ms: Number(raw.duration_ms ?? 0),
    remaining_ms: Number(raw.remaining_ms ?? 0),
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
  };
}

export function normalizeSnapshot(raw: Partial<RuntimeSnapshot> | null | undefined): RuntimeSnapshot {
  if (!raw) return IDLE_RUNTIME;
  return {
    busy: Boolean(raw.busy),
    source: raw.source === 'turno' || raw.source === 'panel' || raw.source === 'estudio' ? raw.source : null,
    current: asStep(raw.current),
    queue: Array.isArray(raw.queue)
      ? raw.queue.map((item) => asStep(item)).filter((item): item is RuntimeStep => item !== null)
      : [],
  };
}

export function isTurnoStreak(snap: Pick<RuntimeSnapshot, 'busy' | 'source'>): boolean {
  return snap.busy === true && snap.source === 'turno';
}

export function applyRuntimeTick(state: RuntimeViewState, incoming: RuntimeSnapshot): RuntimeViewState {
  const next = normalizeSnapshot(incoming);
  const dismissed = isTurnoStreak(next) ? state.dismissedThisStreak : false;
  const autoOpen = isTurnoStreak(next) && !isTurnoStreak(state.runtime) && !dismissed;
  return {
    runtime: next,
    drawerOpen: autoOpen ? true : state.drawerOpen,
    dismissedThisStreak: dismissed,
  };
}

export function applyManualClose(state: RuntimeViewState): RuntimeViewState {
  return {
    ...state,
    drawerOpen: false,
    dismissedThisStreak: isTurnoStreak(state.runtime) ? true : state.dismissedThisStreak,
  };
}

export function formatDurationMs(ms: number): string {
  const value = Math.max(0, ms);
  const seconds = value / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  return `${Math.round(seconds)} s`;
}

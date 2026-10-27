import { describe, expect, it } from 'vitest';
import {
  IDLE_RUNTIME,
  applyManualClose,
  applyRuntimeTick,
  formatDurationMs,
  isTurnoStreak,
  normalizeSnapshot,
  RuntimeSnapshot,
  RuntimeViewState,
} from './hardware-runtime';

const turnoBusy: RuntimeSnapshot = {
  busy: true,
  source: 'turno',
  current: {
    id: 1,
    name: 'asentir',
    mode: 'normal',
    source: 'turno',
    duration_ms: 0,
    remaining_ms: 0,
    blocks: [],
  },
  queue: [],
};

const panelBusy: RuntimeSnapshot = {
  ...turnoBusy,
  source: 'panel',
  current: { ...turnoBusy.current!, source: 'panel' },
};

const idleState: RuntimeViewState = {
  runtime: IDLE_RUNTIME,
  drawerOpen: false,
  dismissedThisStreak: false,
};

describe('isTurnoStreak', () => {
  it('is true only when busy and source is turno', () => {
    expect(isTurnoStreak(turnoBusy)).toBe(true);
    expect(isTurnoStreak(panelBusy)).toBe(false);
    expect(isTurnoStreak(IDLE_RUNTIME)).toBe(false);
  });
});

describe('applyRuntimeTick', () => {
  it('opens on idle to turno', () => {
    const next = applyRuntimeTick(idleState, turnoBusy);
    expect(next.drawerOpen).toBe(true);
    expect(next.dismissedThisStreak).toBe(false);
  });

  it('does not open on panel or estudio', () => {
    expect(applyRuntimeTick(idleState, panelBusy).drawerOpen).toBe(false);
    expect(
      applyRuntimeTick(idleState, { ...panelBusy, source: 'estudio' }).drawerOpen,
    ).toBe(false);
  });

  it('opens when source becomes turno while already busy', () => {
    const fromPanel: RuntimeViewState = {
      runtime: panelBusy,
      drawerOpen: false,
      dismissedThisStreak: false,
    };
    expect(applyRuntimeTick(fromPanel, turnoBusy).drawerOpen).toBe(true);
  });

  it('does not reopen during the same turno streak after a manual close', () => {
    const open = applyRuntimeTick(idleState, turnoBusy);
    const closed = applyManualClose(open);
    expect(closed.drawerOpen).toBe(false);
    expect(closed.dismissedThisStreak).toBe(true);
    const still = applyRuntimeTick(closed, turnoBusy);
    expect(still.drawerOpen).toBe(false);
  });

  it('opens on the next turno streak after idle', () => {
    const closed = applyManualClose(applyRuntimeTick(idleState, turnoBusy));
    const afterIdle = applyRuntimeTick(closed, IDLE_RUNTIME);
    expect(afterIdle.dismissedThisStreak).toBe(false);
    expect(applyRuntimeTick(afterIdle, turnoBusy).drawerOpen).toBe(true);
  });
});

describe('normalizeSnapshot', () => {
  it('fills missing blocks as an empty list on current', () => {
    const raw = {
      busy: true,
      source: 'turno' as const,
      current: { id: 1, name: 'x', mode: 'espera' as const, source: 'turno' as const, duration_ms: 1000 },
      queue: [{ id: 1, name: 'x', mode: 'neutro' as const, source: 'turno' as const, duration_ms: 0 }],
    };
    const snap = normalizeSnapshot(raw);
    expect(snap.current?.blocks).toEqual([]);
    expect(snap.current?.remaining_ms).toBe(0);
    expect(snap.queue[0].blocks).toEqual([]);
  });
});

describe('formatDurationMs', () => {
  it('shows one decimal under ten seconds', () => {
    expect(formatDurationMs(1500)).toBe('1.5 s');
    expect(formatDurationMs(10000)).toBe('10 s');
  });
});

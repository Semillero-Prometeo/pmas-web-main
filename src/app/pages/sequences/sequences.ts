import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GATEWAY_URL } from '../../core/constants/gateway';
const SEQ_STORAGE_KEY = 'r1_sequences';

type ExecState = 'idle' | 'executing' | 'done' | 'error';
type Category  = 'navigation' | 'interaction' | 'system';

interface Routine {
  id: string;
  label: string;
  description: string;
  icon: string;
  endpoint: string;
  category: Category;
  duration: string;
}

interface SequenceStep {
  uid: number;
  routine: Routine;
  delayMs: number;
}

interface SavedSequence {
  name: string;
  steps: SequenceStep[];
}

@Component({
  selector: 'app-sequences',
  imports: [FormsModule],
  templateUrl: './sequences.html',
})
export class Sequences implements OnInit {
  private http = inject(HttpClient);

  // ── ROUTINES ─────────────────────────────────────────────────────────────
  readonly routines: Routine[] = [
    { id: 'find_all',    label: 'Find All',          description: 'Exploración completa del entorno',   icon: 'travel_explore',    endpoint: 'find-all',    category: 'navigation',  duration: '~15s' },
    { id: 'stand_by',   label: 'Stand By',           description: 'Posición de reposo neutral',          icon: 'accessibility_new', endpoint: 'stand-by',    category: 'system',      duration: '~3s'  },
    { id: 'wave',       label: 'Saludo',              description: 'Movimiento de saludo con brazo',      icon: 'waving_hand',       endpoint: 'wave',        category: 'interaction', duration: '~4s'  },
    { id: 'point',      label: 'Señalar',             description: 'Apuntar en dirección frontal',        icon: 'back_hand',         endpoint: 'point',       category: 'interaction', duration: '~3s'  },
    { id: 'head_scan',  label: 'Head Scan',           description: 'Barrido panorámico de cabeza',        icon: 'radar',             endpoint: 'head-scan',   category: 'navigation',  duration: '~8s'  },
    { id: 'arms_open',  label: 'Brazos Abiertos',     description: 'Extender ambos brazos laterales',     icon: 'open_in_full',      endpoint: 'arms-open',   category: 'interaction', duration: '~2s'  },
    { id: 'arms_home',  label: 'Brazos Inicio',       description: 'Retornar brazos a posición base',     icon: 'close_fullscreen',  endpoint: 'arms-home',   category: 'system',      duration: '~2s'  },
    { id: 'walk_fwd',   label: 'Avanzar',             description: 'Secuencia de marcha hacia adelante',  icon: 'directions_walk',   endpoint: 'walk-fwd',    category: 'navigation',  duration: '~5s'  },
    { id: 'turn_left',  label: 'Giro Izquierda',      description: 'Rotación 90° a la izquierda',         icon: 'turn_left',         endpoint: 'turn-left',   category: 'navigation',  duration: '~4s'  },
    { id: 'turn_right', label: 'Giro Derecha',        description: 'Rotación 90° a la derecha',           icon: 'turn_right',        endpoint: 'turn-right',  category: 'navigation',  duration: '~4s'  },
    { id: 'calibrate',  label: 'Calibrar',            description: 'Calibración de todos los servos',     icon: 'tune',              endpoint: 'calibrate',   category: 'system',      duration: '~20s' },
    { id: 'reset_pos',  label: 'Resetear',            description: 'Volver a posición inicial completa',  icon: 'restart_alt',       endpoint: 'reset',       category: 'system',      duration: '~5s'  },
  ];

  // ── SEQUENCE ─────────────────────────────────────────────────────────────
  sequence       = signal<SequenceStep[]>([]);
  sequenceName   = signal('');
  savedSequences = signal<SavedSequence[]>([]);
  defaultDelay   = signal(500);
  isPlayingSeq   = signal(false);
  seqProgress    = signal(0);
  activeSubTab   = signal<'build' | 'saved'>('build');
  execStateMap   = signal<Record<string, ExecState>>({});
  private stepUid = 0;

  seqProgressPct = computed(() => {
    const total = this.sequence().length;
    return total ? Math.round((this.seqProgress() / total) * 100) : 0;
  });

  getExecState(id: string): ExecState {
    return this.execStateMap()[id] ?? 'idle';
  }

  addToSequence(routine: Routine) {
    this.stepUid++;
    this.sequence.update(s => [...s, { uid: this.stepUid, routine, delayMs: this.defaultDelay() }]);
  }

  removeStep(uid: number) {
    this.sequence.update(s => s.filter(step => step.uid !== uid));
  }

  moveStep(uid: number, dir: 'up' | 'down') {
    this.sequence.update(steps => {
      const idx = steps.findIndex(s => s.uid === uid);
      if (idx === -1) return steps;
      const next = dir === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= steps.length) return steps;
      const arr = [...steps];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  clearSequence() {
    this.sequence.set([]);
    this.seqProgress.set(0);
  }

  playSequence() {
    const steps = this.sequence();
    if (!steps.length || this.isPlayingSeq()) return;
    this.isPlayingSeq.set(true);
    this.seqProgress.set(0);
    this.playStep(steps, 0);
  }

  stopSequence() {
    this.isPlayingSeq.set(false);
  }

  private playStep(steps: SequenceStep[], idx: number) {
    if (!this.isPlayingSeq() || idx >= steps.length) {
      this.isPlayingSeq.set(false);
      return;
    }
    const step = steps[idx];
    this.execStateMap.update(m => ({ ...m, [step.routine.id]: 'executing' }));
    this.http.post(`${GATEWAY_URL}/robotics/execute`, { routine: step.routine.endpoint }).subscribe({
      next:  () => this.afterStep(steps, idx, step, true),
      error: () => this.afterStep(steps, idx, step, false),
    });
  }

  private afterStep(steps: SequenceStep[], idx: number, step: SequenceStep, ok: boolean) {
    this.execStateMap.update(m => ({ ...m, [step.routine.id]: ok ? 'done' : 'error' }));
    this.seqProgress.set(idx + 1);
    setTimeout(() => {
      this.execStateMap.update(m => ({ ...m, [step.routine.id]: 'idle' }));
      this.playStep(steps, idx + 1);
    }, step.delayMs);
  }

  saveSequence() {
    const name = this.sequenceName().trim();
    if (!name || !this.sequence().length) return;
    this.savedSequences.update(saved => {
      const idx = saved.findIndex(s => s.name === name);
      const entry: SavedSequence = { name, steps: [...this.sequence()] };
      const arr = [...saved];
      idx !== -1 ? (arr[idx] = entry) : arr.push(entry);
      return arr;
    });
    localStorage.setItem(SEQ_STORAGE_KEY, JSON.stringify(this.savedSequences()));
    this.sequenceName.set('');
  }

  loadSaved(saved: SavedSequence) {
    this.sequence.set(saved.steps.map(s => ({ ...s })));
    this.activeSubTab.set('build');
  }

  deleteSaved(name: string) {
    this.savedSequences.update(s => s.filter(seq => seq.name !== name));
    localStorage.setItem(SEQ_STORAGE_KEY, JSON.stringify(this.savedSequences()));
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  categoryBadgeClass(cat: Category): string {
    switch (cat) {
      case 'navigation':  return 'text-primary   bg-primary/10   border-primary/20';
      case 'interaction': return 'text-secondary bg-secondary/10 border-secondary/20';
      case 'system':      return 'text-tertiary  bg-tertiary/10  border-tertiary/20';
    }
  }

  categoryLabel(cat: Category): string {
    switch (cat) {
      case 'navigation':  return 'NAV';
      case 'interaction': return 'INT';
      case 'system':      return 'SYS';
    }
  }

  stepStateClass(id: string): string {
    switch (this.getExecState(id)) {
      case 'executing': return 'border-primary bg-primary/10';
      case 'done':      return 'border-secondary/50 bg-secondary/5';
      case 'error':     return 'border-error/50 bg-error/5';
      default:          return 'border-white/5';
    }
  }

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────
  ngOnInit() {
    try {
      const raw = localStorage.getItem(SEQ_STORAGE_KEY);
      if (raw) this.savedSequences.set(JSON.parse(raw));
    } catch { /* ignore */ }
  }
}

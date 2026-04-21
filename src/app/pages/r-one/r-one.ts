import {
  Component, signal, computed,
  inject, OnInit,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { GATEWAY_URL } from '../../core/constants/gateway';

const SEQ_STORAGE_KEY = 'r1_sequences';

export type Tab = 'movements' | 'sequences';
export type ExecState = 'idle' | 'executing' | 'done' | 'error';
export type Category = 'navigation' | 'interaction' | 'system';

export interface Routine {
  id: string;
  label: string;
  description: string;
  icon: string;
  endpoint: string;
  category: Category;
  duration: string;
}

export interface SequenceStep {
  uid: number;
  routine: Routine;
  delayMs: number;
}

export interface SavedSequence {
  name: string;
  steps: SequenceStep[];
}

@Component({
  selector: 'app-r-one',
  imports: [RouterLink, FormsModule],
  templateUrl: './r-one.html',
})
export class ROne implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // ── STATE ────────────────────────────────────────────────────────────────
  activeTab = signal<Tab>('movements');
  connected = signal(false);

  // ── ROUTINES ─────────────────────────────────────────────────────────────
  readonly routines: Routine[] = [
    { id: 'find_all',    label: 'Find All',         description: 'Exploración completa del entorno',  icon: 'travel_explore',    endpoint: 'find-all',    category: 'navigation',  duration: '~15s' },
    { id: 'stand_by',   label: 'Stand By',          description: 'Posición de reposo neutral',         icon: 'accessibility_new', endpoint: 'stand-by',    category: 'system',      duration: '~3s'  },
    { id: 'wave',       label: 'Saludo',             description: 'Movimiento de saludo con brazo',     icon: 'waving_hand',       endpoint: 'wave',        category: 'interaction', duration: '~4s'  },
    { id: 'point',      label: 'Señalar',            description: 'Apuntar en dirección frontal',       icon: 'back_hand',         endpoint: 'point',       category: 'interaction', duration: '~3s'  },
    { id: 'head_scan',  label: 'Head Scan',          description: 'Barrido panorámico de cabeza',       icon: 'radar',             endpoint: 'head-scan',   category: 'navigation',  duration: '~8s'  },
    { id: 'arms_open',  label: 'Brazos Abiertos',    description: 'Extender ambos brazos laterales',    icon: 'open_in_full',      endpoint: 'arms-open',   category: 'interaction', duration: '~2s'  },
    { id: 'arms_home',  label: 'Brazos Inicio',      description: 'Retornar brazos a posición base',    icon: 'close_fullscreen',  endpoint: 'arms-home',   category: 'system',      duration: '~2s'  },
    { id: 'walk_fwd',   label: 'Avanzar',            description: 'Secuencia de marcha hacia adelante', icon: 'directions_walk',   endpoint: 'walk-fwd',    category: 'navigation',  duration: '~5s'  },
    { id: 'turn_left',  label: 'Giro Izquierda',     description: 'Rotación 90° a la izquierda',        icon: 'turn_left',         endpoint: 'turn-left',   category: 'navigation',  duration: '~4s'  },
    { id: 'turn_right', label: 'Giro Derecha',       description: 'Rotación 90° a la derecha',          icon: 'turn_right',        endpoint: 'turn-right',  category: 'navigation',  duration: '~4s'  },
    { id: 'calibrate',  label: 'Calibrar',           description: 'Calibración de todos los servos',    icon: 'tune',              endpoint: 'calibrate',   category: 'system',      duration: '~20s' },
    { id: 'reset_pos',  label: 'Resetear',           description: 'Volver a posición inicial completa', icon: 'restart_alt',       endpoint: 'reset',       category: 'system',      duration: '~5s'  },
  ];

  activeCategory = signal<'all' | Category>('all');

  filteredRoutines = computed(() => {
    const cat = this.activeCategory();
    return cat === 'all' ? this.routines : this.routines.filter(r => r.category === cat);
  });

  execStateMap = signal<Record<string, ExecState>>({});
  executingId  = signal<string | null>(null);

  getExecState(id: string): ExecState {
    return this.execStateMap()[id] ?? 'idle';
  }

  routineCardClass(id: string): string {
    const base = 'relative rounded-2xl border flex flex-col items-start gap-3 p-5 text-left transition-all duration-200 cursor-pointer active:scale-[0.97] select-none';
    switch (this.getExecState(id)) {
      case 'executing': return `${base} bg-primary/15 border-primary`;
      case 'done':      return `${base} bg-secondary/10 border-secondary`;
      case 'error':     return `${base} bg-error/10 border-error`;
      default:          return `${base} bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800/70`;
    }
  }

  executeRoutine(routine: Routine) {
    if (this.executingId()) return;
    this.executingId.set(routine.id);
    this.execStateMap.update(m => ({ ...m, [routine.id]: 'executing' }));

    this.http.post(`${GATEWAY_URL}/robotics/execute`, { routine: routine.endpoint }).subscribe({
      next: () => this.onExecDone(routine.id, true),
      error: () => this.onExecDone(routine.id, false),
    });
  }

  private onExecDone(id: string, ok: boolean) {
    this.execStateMap.update(m => ({ ...m, [id]: ok ? 'done' : 'error' }));
    this.executingId.set(null);
    setTimeout(() => this.execStateMap.update(m => ({ ...m, [id]: 'idle' })), 2000);
  }

  // ── SEQUENCES ────────────────────────────────────────────────────────────
  sequence         = signal<SequenceStep[]>([]);
  sequenceName     = signal('');
  savedSequences   = signal<SavedSequence[]>([]);
  defaultDelay     = signal(500);
  isPlayingSeq     = signal(false);
  seqProgress      = signal(0);
  seqSubTab        = signal<'build' | 'saved'>('build');
  private stepUid  = 0;

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

  clearSequence() { this.sequence.set([]); this.seqProgress.set(0); }

  playSequence() {
    const steps = this.sequence();
    if (!steps.length || this.isPlayingSeq()) return;
    this.isPlayingSeq.set(true);
    this.seqProgress.set(0);
    this.playStep(steps, 0);
  }

  stopSequence() { this.isPlayingSeq.set(false); }

  private playStep(steps: SequenceStep[], idx: number) {
    if (!this.isPlayingSeq() || idx >= steps.length) {
      this.isPlayingSeq.set(false);
      return;
    }
    const step = steps[idx];
    this.execStateMap.update(m => ({ ...m, [step.routine.id]: 'executing' }));
    this.http.post(`${GATEWAY_URL}/robotics/execute`, { routine: step.routine.endpoint }).subscribe({
      next: () => this.afterStep(steps, idx, step, true),
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
    this.seqSubTab.set('build');
  }

  deleteSaved(name: string) {
    this.savedSequences.update(s => s.filter(seq => seq.name !== name));
    localStorage.setItem(SEQ_STORAGE_KEY, JSON.stringify(this.savedSequences()));
  }

  seqProgressPct = computed(() => {
    const total = this.sequence().length;
    return total ? Math.round((this.seqProgress() / total) * 100) : 0;
  });

  // ── CATEGORY HELPERS ────────────────────────────────────────────────────
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

  // ── LOGIN OVERLAY ────────────────────────────────────────────────────────
  loginUsername  = signal('');
  loginPassword  = signal('');
  loginBusy      = signal(false);
  loginError     = signal<string | null>(null);
  showRolePicker = signal(false);

  doLogin() {
    const username = this.loginUsername().trim();
    const password = this.loginPassword();
    if (!username || !password || this.loginBusy()) return;
    this.loginBusy.set(true);
    this.loginError.set(null);

    this.auth.login({ username, password }).subscribe({
      next: () => {
        this.loginBusy.set(false);
        if (this.auth.availableRoles().length > 1) {
          this.showRolePicker.set(true);
        }
        // single role → isAuthenticated() becomes true → overlay closes automatically
      },
      error: () => {
        this.loginBusy.set(false);
        this.loginError.set(this.auth.error() ?? 'Error al iniciar sesión');
      },
    });
  }

  onLoginKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.doLogin();
  }

  confirmRoleAndClose(index: number) {
    this.auth.confirmRole(index);
    this.showRolePicker.set(false);
  }

  // ── LIFECYCLE ───────────────────────────────────────────────────────────
  ngOnInit() {
    try {
      const raw = localStorage.getItem(SEQ_STORAGE_KEY);
      if (raw) this.savedSequences.set(JSON.parse(raw));
    } catch { /* ignore */ }

    this.http.get(`${GATEWAY_URL}/robotics/health`).subscribe({
      next:  () => this.connected.set(true),
      error: () => this.connected.set(false),
    });
  }
}

import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HealthStatusDropdown } from '../../components/health-status-dropdown/health-status-dropdown';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { HealthService } from '../../core/services/health.service';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupByCategory,
  isPlayableSequence,
  PlayableSequence,
  SequenceCategory,
} from './sequence-groups';
import { catalogSequenceCount, panelKpis } from './panel-kpis';

interface MotionBlock {
  arduino_id: number;
  pca: number;
  servo: number;
  inicio: number;
  dur: number;
  pos: number;
  vel: number;
  nombre: string;
}

interface SequenceFile {
  name: string;
  file_name: string;
  id?: number | null;
  description?: string;
  category?: string | null;
}

interface SequenceDetail {
  version: number;
  id?: number | null;
  name: string;
  description?: string;
  category?: string | null;
  blocks: MotionBlock[];
  blocks_neutro?: MotionBlock[];
}

interface SequenceLog {
  id: number;
  timestamp: string;
  group: string;
  sequenceName: string;
  status: string;
  message?: string;
}

interface RuntimeStep {
  id: number | null;
  name: string;
  mode: 'normal' | 'neutro' | 'espera';
  source: 'turno' | 'panel' | 'estudio';
}

interface RuntimeSnapshot {
  busy: boolean;
  source: 'turno' | 'panel' | 'estudio' | null;
  current: RuntimeStep | null;
  queue: RuntimeStep[];
}

const EXECUTION_LOG_STORAGE_KEY = 'prometeo_execution_logs_v1';
const IDLE_RUNTIME: RuntimeSnapshot = { busy: false, source: null, current: null, queue: [] };

@Component({
  selector: 'app-control-panel',
  imports: [FormsModule, HealthStatusDropdown],
  templateUrl: './control-panel.html',
})
export class ControlPanel implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('logScroll') logScroll!: ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  health = inject(HealthService);
  private runtimeTimer: ReturnType<typeof setTimeout> | null = null;
  private logCounter = 0;

  sequenceGroups = signal(groupByCategory([]));
  sequenceLoading = signal(true);
  sequenceError = signal<string | null>(null);
  movementSearch = signal('');
  selectedGroupFilter = signal('ALL');

  runtime = signal<RuntimeSnapshot>(IDLE_RUNTIME);
  runtimeUnreachable = signal(false);
  playLocked = computed(() => this.runtimeUnreachable() || this.runtime().busy);

  commandLogs = signal<SequenceLog[]>([]);
  sequenceCount = computed(() => catalogSequenceCount(this.sequenceGroups()));
  kpis = computed(() =>
    panelKpis({
      runtimeUnreachable: this.runtimeUnreachable(),
      busy: this.runtime().busy,
      source: this.runtime().source,
      sequenceLoading: this.sequenceLoading(),
      sequenceError: this.sequenceError(),
      sequenceCount: this.sequenceCount(),
      lastLog: this.commandLogs()[0] ?? null,
    }),
  );
  ackCount = computed(() => this.commandLogs().filter((item) => item.status === 'ack').length);
  groupFilterOptions = computed(() => [
    { value: 'ALL', label: 'Todas' },
    ...CATEGORY_ORDER.map((key) => ({ value: key, label: CATEGORY_LABELS[key] })),
  ]);
  filteredSequenceGroups = computed(() => {
    const selectedGroup = this.selectedGroupFilter();
    const query = this.movementSearch().trim().toLowerCase();
    const byGroup =
      selectedGroup === 'ALL'
        ? this.sequenceGroups()
        : this.sequenceGroups().filter((group) => group.key === selectedGroup);

    if (!query) return byGroup;

    return byGroup
      .map((group) => ({
        ...group,
        sequences: group.sequences.filter((sequence) => {
          const display = this.displaySequenceName(sequence.name).toLowerCase();
          const description = (sequence.description ?? '').toLowerCase();
          return display.includes(query) || sequence.name.toLowerCase().includes(query) || description.includes(query);
        }),
      }))
      .filter((group) => group.sequences.length > 0);
  });

  ngOnInit() {
    this.restoreLogsFromStorage();
    this.health.checkAll();
    this.loadSequences();
    this.pollRuntime();
  }

  ngOnDestroy() {
    if (this.runtimeTimer) {
      clearTimeout(this.runtimeTimer);
      this.runtimeTimer = null;
    }
  }

  loadSequences() {
    this.sequenceLoading.set(true);
    this.sequenceError.set(null);

    this.http.get<{ total: number; data: SequenceFile[] }>(`${GATEWAY_URL}/sequence/files`).subscribe({
      next: (res) => {
        if (!res.data.length) {
          this.sequenceGroups.set(groupByCategory([]));
          this.sequenceLoading.set(false);
          return;
        }

        const requests = res.data.map((file) =>
          this.http
            .get<SequenceDetail>(`${GATEWAY_URL}/sequence/file`, { params: { name: file.name } })
            .pipe(
              map((sequence) => ({ name: file.name, sequence, file })),
              catchError(() => of({ name: file.name, sequence: null, file })),
            ),
        );

        forkJoin(requests).subscribe({
          next: (entries) => {
            const playable: PlayableSequence[] = [];
            for (const entry of entries) {
              if (!entry.sequence) continue;
              const item: PlayableSequence = {
                name: entry.name,
                description: entry.sequence.description ?? entry.file.description ?? '',
                category: (entry.sequence.category ?? entry.file.category) as SequenceCategory | null,
                blocks: entry.sequence.blocks ?? [],
                blocks_neutro: entry.sequence.blocks_neutro ?? [],
              };
              if (isPlayableSequence(item)) playable.push(item);
            }
            this.sequenceGroups.set(groupByCategory(playable));
            this.sequenceLoading.set(false);
          },
          error: () => {
            this.sequenceError.set('No se pudieron cargar los detalles de secuencias');
            this.sequenceLoading.set(false);
          },
        });
      },
      error: () => {
        this.sequenceError.set('No se pudo cargar las secuencias del robot.');
        this.sequenceLoading.set(false);
      },
    });
  }

  executePhase(name: string, mode: 'normal' | 'neutro') {
    if (this.playLocked()) return;
    this.appendLog({
      group: this.groupLabelForSequence(name),
      sequenceName: `${name} ${mode}`,
      status: 'sent',
      message: 'Ejecución solicitada',
    });
    this.http
      .post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/play`, {
        name,
        mode,
        source: 'panel',
      })
      .subscribe({
        next: () => {
          this.appendLog({
            group: this.groupLabelForSequence(name),
            sequenceName: `${name} ${mode}`,
            status: 'ack',
            message: 'Solicitado',
          });
          this.pollRuntime();
        },
        error: (err: { error?: { message?: string } }) => {
          this.appendLog({
            group: this.groupLabelForSequence(name),
            sequenceName: name,
            status: 'error',
            message: err?.error?.message || 'No se pudo ejecutar',
          });
        },
      });
  }

  stopHardware() {
    this.http.post(`${GATEWAY_URL}/sequence/stop`, {}).subscribe({
      next: () => {
        this.appendLog({
          group: 'HARDWARE',
          sequenceName: 'stop',
          status: 'ack',
          message: 'Detenido',
        });
        this.pollRuntime();
      },
      error: () =>
        this.appendLog({
          group: 'HARDWARE',
          sequenceName: 'stop',
          status: 'error',
          message: 'No se pudo detener',
        }),
    });
  }

  private pollRuntime() {
    if (this.runtimeTimer) {
      clearTimeout(this.runtimeTimer);
      this.runtimeTimer = null;
    }
    this.http.get<RuntimeSnapshot>(`${GATEWAY_URL}/sequence/runtime`).subscribe({
      next: (res) => {
        this.runtimeUnreachable.set(false);
        this.runtime.set(res);
        this.runtimeTimer = setTimeout(() => this.pollRuntime(), res.busy ? 500 : 3000);
      },
      error: () => {
        this.runtimeUnreachable.set(true);
        this.runtimeTimer = setTimeout(() => this.pollRuntime(), 500);
      },
    });
  }

  private groupLabelForSequence(sequenceName: string): string {
    for (const group of this.sequenceGroups()) {
      if (group.sequences.some((item) => item.name === sequenceName)) {
        return group.label;
      }
    }
    return 'N/A';
  }

  private appendLog(log: Omit<SequenceLog, 'id' | 'timestamp'>) {
    this.logCounter++;
    const nextLog: SequenceLog = {
      id: this.logCounter,
      timestamp: this.now(),
      ...log,
    };
    this.commandLogs.update((items) => [nextLog, ...items].slice(0, 300));
    this.persistLogsToStorage();
    this.shouldScrollLog = true;
  }

  clearLogs() {
    this.commandLogs.set([]);
    this.persistLogsToStorage();
  }

  logStatusColor(status: SequenceLog['status']): string {
    switch (status) {
      case 'sent':
        return 'text-tertiary';
      case 'ack':
        return 'text-secondary';
      case 'error':
        return 'text-error';
      default:
        return 'text-outline';
    }
  }

  logStatusIcon(status: SequenceLog['status']): string {
    switch (status) {
      case 'sent':
        return 'send';
      case 'ack':
        return 'done_all';
      case 'error':
        return 'error';
      default:
        return 'schedule';
    }
  }
  private shouldScrollLog = false;

  ngAfterViewChecked() {
    if (this.shouldScrollLog && this.logScroll) {
      this.logScroll.nativeElement.scrollTop = 0;
      this.shouldScrollLog = false;
    }
  }

  private now(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  trackLog(_: number, log: SequenceLog) {
    return log.id;
  }

  private persistLogsToStorage() {
    try {
      localStorage.setItem(EXECUTION_LOG_STORAGE_KEY, JSON.stringify(this.commandLogs()));
    } catch {
      // Ignore storage quota errors silently to avoid blocking execution UX.
    }
  }

  private restoreLogsFromStorage() {
    try {
      const raw = localStorage.getItem(EXECUTION_LOG_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const logs = parsed.filter((item) => item && typeof item === 'object').slice(0, 300) as SequenceLog[];
      this.commandLogs.set(logs);
      this.logCounter = logs.reduce((max, item) => Math.max(max, item.id ?? 0), 0);
    } catch {
      this.commandLogs.set([]);
      this.logCounter = 0;
    }
  }

  displaySequenceName(sequenceName: string): string {
    const normalized = sequenceName.replace(/\\/g, '/');
    const separatorIndex = normalized.lastIndexOf('/');
    return separatorIndex >= 0 ? normalized.slice(separatorIndex + 1) : normalized;
  }

  updateMovementSearch(value: string) {
    this.movementSearch.set(value);
  }

  updateGroupFilter(value: string) {
    this.selectedGroupFilter.set(value);
  }
}

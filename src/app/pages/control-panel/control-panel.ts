import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HealthStatusDropdown } from '../../components/health-status-dropdown/health-status-dropdown';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { HealthService } from '../../core/services/health.service';
import { catchError, forkJoin, map, of } from 'rxjs';

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
}

interface SequenceDetail {
  version: number;
  name: string;
  blocks: MotionBlock[];
}

interface SequenceGroup {
  key: string;
  label: string;
  sequenceNames: string[];
}

interface SequenceLog {
  id: number;
  timestamp: string;
  group: string;
  sequenceName: string;
  status: string;
  message?: string;
}

const EXECUTION_LOG_STORAGE_KEY = 'prometeo_execution_logs_v1';

@Component({
  selector: 'app-control-panel',
  imports: [FormsModule, HealthStatusDropdown],
  templateUrl: './control-panel.html',
})
export class ControlPanel implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('logScroll')  logScroll!:  ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);
  health = inject(HealthService);
  private chainStatusTimer: ReturnType<typeof setInterval> | null = null;
  private logCounter = 0;

  // ── Telemetry ──────────────────────────────────────────────────────────────
  uptime      = signal('14:02:55');
  cpuLoad     = signal(64);
  memAlloc    = signal(30);
  temperature = signal(42);
  velocity    = signal(0.85);

  // ── Sequences ──────────────────────────────────────────────────────────────
  sequenceGroups = signal<SequenceGroup[]>([]);
  sequenceLoading = signal(true);
  sequenceError = signal<string | null>(null);
  movementSearch = signal('');
  selectedGroupFilter = signal('ALL');
  selectedChain = signal<string[]>([]);
  sequenceCache = new Map<string, SequenceDetail>();
  executingSequenceName = signal<string | null>(null);

  chainRunning = signal(false);
  chainCurrentSequence = signal<string | null>(null);
  chainCompletedItems = signal(0);
  chainTotalItems = signal(0);

  commandLogs = signal<SequenceLog[]>([]);
  ackCount = computed(() => this.commandLogs().filter((item) => item.status === 'ack').length);
  groupFilterOptions = computed(() => [
    { value: 'ALL', label: 'Todos los grupos' },
    ...this.sequenceGroups().map((group) => ({ value: group.key, label: group.label })),
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
        sequenceNames: group.sequenceNames.filter((name) => {
          const display = this.displaySequenceName(name).toLowerCase();
          return display.includes(query) || name.toLowerCase().includes(query);
        }),
      }))
      .filter((group) => group.sequenceNames.length > 0);
  });

  ngOnInit() {
    this.restoreLogsFromStorage();
    this.health.checkAll();
    this.loadSequences();
    this.refreshChainStatus();
    this.chainStatusTimer = setInterval(() => this.refreshChainStatus(), 60000);
  }

  ngOnDestroy() {
    if (this.chainStatusTimer) {
      clearInterval(this.chainStatusTimer);
      this.chainStatusTimer = null;
    }
  }

  loadSequences() {
    this.sequenceLoading.set(true);
    this.sequenceError.set(null);

    this.http.get<{ total: number; data: SequenceFile[] }>(`${GATEWAY_URL}/sequence/files`).subscribe({
      next: (res) => {
        if (!res.data.length) {
          this.sequenceGroups.set([]);
          this.sequenceLoading.set(false);
          return;
        }

        const requests = res.data.map((file) =>
          this.http
            .get<SequenceDetail>(`${GATEWAY_URL}/sequence/file`, { params: { name: file.name } })
            .pipe(
              map((sequence) => ({ name: file.name, sequence })),
              catchError(() => of({ name: file.name, sequence: null })),
            ),
        );

        forkJoin(requests).subscribe({
          next: (entries) => {
            const grouping = new Map<string, string[]>();
            this.sequenceCache.clear();
            for (const entry of entries) {
              if (!entry.sequence) continue;
              this.sequenceCache.set(entry.name, entry.sequence);
              const key = this.extractSequenceFolderKey(entry.name);
              const list = grouping.get(key) ?? [];
              list.push(entry.name);
              grouping.set(key, list);
            }

            const groups: SequenceGroup[] = Array.from(grouping.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, sequenceNames]) => ({
                key,
                label: key === 'ROOT' ? 'Sin carpeta' : key,
                sequenceNames: sequenceNames.sort((a, b) => a.localeCompare(b)),
              }));
            this.sequenceGroups.set(groups);
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

  executeSequence(sequenceName: string) {
    const sequence = this.sequenceCache.get(sequenceName);
    if (!sequence || !sequence.blocks.length) return;
    this.executingSequenceName.set(sequenceName);
    this.appendLog({
      group: this.groupLabelForSequence(sequenceName),
      sequenceName,
      status: 'sent',
      message: 'Ejecución individual solicitada',
    });

    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/play`, { blocks: sequence.blocks }).subscribe({
      next: () => {
        this.appendLog({
          group: this.groupLabelForSequence(sequenceName),
          sequenceName,
          status: 'ack',
          message: 'Secuencia en ejecución',
        });
        this.executingSequenceName.set(null);
      },
      error: () => {
        this.appendLog({
          group: this.groupLabelForSequence(sequenceName),
          sequenceName,
          status: 'error',
          message: 'Error al iniciar secuencia',
        });
        this.executingSequenceName.set(null);
      },
    });
  }

  addToChain(sequenceName: string) {
    this.selectedChain.update((items) => [...items, sequenceName]);
  }

  removeFromChain(index: number) {
    this.selectedChain.update((items) => items.filter((_, idx) => idx !== index));
  }

  clearChain() {
    this.selectedChain.set([]);
  }

  startChain() {
    const items = this.selectedChain().map((name) => ({ name, repeat: 1, delay_ms: 0 }));
    if (!items.length) return;

    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/chain/start`, { items }).subscribe({
      next: () => {
        this.appendLog({
          group: 'CHAIN',
          sequenceName: items.map((item) => item.name).join(' -> '),
          status: 'ack',
          message: 'Cadena iniciada',
        });
        this.refreshChainStatus();
      },
      error: () => {
        this.appendLog({
          group: 'CHAIN',
          sequenceName: items.map((item) => item.name).join(' -> '),
          status: 'error',
          message: 'No se pudo iniciar cadena',
        });
      },
    });
  }

  stopChain() {
    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/chain/stop`, {}).subscribe({
      next: () => {
        this.appendLog({
          group: 'CHAIN',
          sequenceName: this.chainCurrentSequence() ?? 'N/A',
          status: 'ack',
          message: 'Cadena detenida',
        });
        this.refreshChainStatus();
      },
      error: () => {
        this.appendLog({
          group: 'CHAIN',
          sequenceName: this.chainCurrentSequence() ?? 'N/A',
          status: 'error',
          message: 'No se pudo detener cadena',
        });
      },
    });
  }

  refreshChainStatus() {
    this.http
      .get<{
        status: string;
        running: boolean;
        current_sequence: string | null;
        completed_items: number;
        total_items: number;
      }>(`${GATEWAY_URL}/sequence/chain/status`)
      .subscribe({
        next: (res) => {
          this.chainRunning.set(res.running);
          this.chainCurrentSequence.set(res.current_sequence);
          this.chainCompletedItems.set(res.completed_items);
          this.chainTotalItems.set(res.total_items);
        },
        error: () => {
          this.chainRunning.set(false);
        },
      });
  }

  private groupLabelForSequence(sequenceName: string): string {
    for (const group of this.sequenceGroups()) {
      if (group.sequenceNames.includes(sequenceName)) {
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
      case 'sent':    return 'text-tertiary';
      case 'ack':     return 'text-secondary';
      case 'error':   return 'text-error';
      default:        return 'text-outline';
    }
  }

  logStatusIcon(status: SequenceLog['status']): string {
    switch (status) {
      case 'sent':    return 'send';
      case 'ack':     return 'done_all';
      case 'error':   return 'error';
      default:        return 'schedule';
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

  trackLog(_: number, log: SequenceLog) { return log.id; }

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
      const logs = parsed
        .filter((item) => item && typeof item === 'object')
        .slice(0, 300) as SequenceLog[];
      this.commandLogs.set(logs);
      this.logCounter = logs.reduce((max, item) => Math.max(max, item.id ?? 0), 0);
    } catch {
      this.commandLogs.set([]);
      this.logCounter = 0;
    }
  }

  private extractSequenceFolderKey(sequenceName: string): string {
    const normalized = sequenceName.replace(/\\/g, '/');
    const separatorIndex = normalized.lastIndexOf('/');
    if (separatorIndex <= 0) {
      return 'ROOT';
    }
    return normalized.slice(0, separatorIndex);
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

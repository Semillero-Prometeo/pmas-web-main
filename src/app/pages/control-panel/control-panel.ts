import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { Sidebar } from '../../components/sidebar/sidebar';

const GATEWAY_URL = 'http://localhost:3000';

// ── API shapes ────────────────────────────────────────────────────────────────
export interface Action {
  id: number;
  name: string;
  arduino_id: number;
}

interface ActionsResponse {
  total: number;
  data: Action[];
}

interface ExecuteResponse {
  status: string;
  response: string[];
}

// ── Runtime models ────────────────────────────────────────────────────────────
export interface ActionGroup {
  arduino_id: number;
  label: string;
  actions: Action[];
}

export interface ChatMessage {
  id: number;
  from: 'user' | 'robot';
  text: string;
  timestamp: string;
  status?: 'sending' | 'transmitted' | 'speaking' | 'done';
}

export interface CommandLog {
  id: number;
  timestamp: string;
  arduinoId: string;
  actionId: number;
  label: string;
  status: 'pending' | 'sent' | 'ack' | 'error';
  response?: string[];
}

@Component({
  selector: 'app-control-panel',
  imports: [Navbar, Footer, Sidebar, FormsModule, RouterLink],
  templateUrl: './control-panel.html',
})
export class ControlPanel implements OnInit, AfterViewChecked {
  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('logScroll')  logScroll!:  ElementRef<HTMLDivElement>;

  private http = inject(HttpClient);

  // ── Telemetry ──────────────────────────────────────────────────────────────
  uptime      = signal('14:02:55');
  cpuLoad     = signal(64);
  memAlloc    = signal(30);
  temperature = signal(42);
  velocity    = signal(0.85);

  // ── Actions loaded from API ────────────────────────────────────────────────
  actionGroups   = signal<ActionGroup[]>([]);
  actionsLoading = signal(true);
  actionsError   = signal<string | null>(null);

  ngOnInit() {
    this.loadActions();
  }

  loadActions() {
    this.actionsLoading.set(true);
    this.actionsError.set(null);

    this.http.get<ActionsResponse>(`${GATEWAY_URL}/action/actions`).subscribe({
      next: (res) => {
        this.actionGroups.set(this.groupByArduino(res.data));
        this.actionsLoading.set(false);
      },
      error: () => {
        this.actionsError.set('No se pudo cargar las acciones del robot.');
        this.actionsLoading.set(false);
      },
    });
  }

  private groupByArduino(actions: Action[]): ActionGroup[] {
    const map = new Map<number, Action[]>();
    for (const a of actions) {
      const list = map.get(a.arduino_id) ?? [];
      list.push(a);
      map.set(a.arduino_id, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([arduino_id, acts]) => ({
        arduino_id,
        label: `Arduino ${arduino_id}`,
        actions: acts,
      }));
  }

  // ── Execution ──────────────────────────────────────────────────────────────
  executingKey = signal<string | null>(null);   // "arduino_id:action_id"
  commandLogs  = signal<CommandLog[]>([]);
  private logCounter = 0;

  executeAction(group: ActionGroup, action: Action) {
    const key = `${group.arduino_id}:${action.id}`;
    if (this.executingKey() === key) return;

    this.executingKey.set(key);
    this.logCounter++;
    const log: CommandLog = {
      id: this.logCounter,
      timestamp: this.now(),
      arduinoId: `ARD-${group.arduino_id}`,
      actionId: action.id,
      label: action.name,
      status: 'pending',
    };
    this.commandLogs.update(logs => [log, ...logs].slice(0, 200));
    this.shouldScrollLog = true;

    // Mark as sent immediately (request in flight)
    this.commandLogs.update(logs =>
      logs.map(l => l.id === log.id ? { ...l, status: 'sent' } : l)
    );

    this.http.get<ExecuteResponse>(`${GATEWAY_URL}/action/execute`, {
      params: { action_id: action.id, arduino_id: group.arduino_id },
    }).subscribe({
      next: (res) => {
        this.commandLogs.update(logs =>
          logs.map(l => l.id === log.id
            ? { ...l, status: 'ack', response: res.response }
            : l
          )
        );
        this.executingKey.set(null);
      },
      error: () => {
        this.commandLogs.update(logs =>
          logs.map(l => l.id === log.id ? { ...l, status: 'error' } : l)
        );
        this.executingKey.set(null);
      },
    });
  }

  isExecuting(group: ActionGroup, action: Action): boolean {
    return this.executingKey() === `${group.arduino_id}:${action.id}`;
  }

  clearLogs() { this.commandLogs.set([]); }

  logStatusColor(status: CommandLog['status']): string {
    switch (status) {
      case 'pending': return 'text-outline';
      case 'sent':    return 'text-tertiary';
      case 'ack':     return 'text-secondary';
      case 'error':   return 'text-error';
    }
  }

  logStatusIcon(status: CommandLog['status']): string {
    switch (status) {
      case 'pending': return 'schedule';
      case 'sent':    return 'send';
      case 'ack':     return 'done_all';
      case 'error':   return 'error';
    }
  }

  ackCount = computed(() => this.commandLogs().filter(l => l.status === 'ack').length);

  // ── Chat ───────────────────────────────────────────────────────────────────
  inputText  = signal('');
  isSpeaking = signal(false);
  private msgCounter = 0;

  messages = signal<ChatMessage[]>([{
    id: 0, from: 'robot',
    text: 'Sistema de voz activo. Escribe el mensaje que deseas que transmita.',
    timestamp: '14:02:01', status: 'done',
  }]);

  charCount = computed(() => this.inputText().length);

  sendMessage() {
    const text = this.inputText().trim();
    if (!text) return;
    this.msgCounter++;
    const userMsg: ChatMessage = {
      id: this.msgCounter, from: 'user', text,
      timestamp: this.now(), status: 'sending',
    };
    this.messages.update(m => [...m, userMsg]);
    this.inputText.set('');

    setTimeout(() => {
      this.messages.update(m =>
        m.map(msg => msg.id === userMsg.id ? { ...msg, status: 'transmitted' } : msg)
      );
      this.isSpeaking.set(true);
      this.msgCounter++;
      const robotMsg: ChatMessage = {
        id: this.msgCounter, from: 'robot',
        text: `Transmitiendo: "${text}"`,
        timestamp: this.now(), status: 'speaking',
      };
      this.messages.update(m => [...m, robotMsg]);
      const dur = Math.min(Math.max(text.length * 60, 1500), 6000);
      setTimeout(() => {
        this.isSpeaking.set(false);
        this.messages.update(m =>
          m.map(msg => msg.id === robotMsg.id ? { ...msg, status: 'done' } : msg)
        );
      }, dur);
    }, 600);
    this.shouldScroll = true;
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.msgCounter = 0;
    this.messages.set([{
      id: 0, from: 'robot',
      text: 'Chat limpiado. Sistema de voz listo.',
      timestamp: this.now(), status: 'done',
    }]);
  }

  private shouldScroll    = false;
  private shouldScrollLog = false;

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatScroll) {
      this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
    if (this.shouldScrollLog && this.logScroll) {
      this.logScroll.nativeElement.scrollTop = 0;
      this.shouldScrollLog = false;
    }
  }

  private now(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  trackMessage(_: number, msg: ChatMessage)  { return msg.id; }
  trackLog    (_: number, log: CommandLog)   { return log.id; }
}

import {
  Component,
  computed,
  inject,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { environment } from '../../../environments/environment';
import {
  filterSpeakPhrases,
  sortPhrasesNewestFirst,
  type Phrase,
  type PhraseCatalog,
} from './decir-phrases';
import {
  microphoneDetail as buildMicrophoneDetail,
  microphoneLevel as buildMicrophoneLevel,
  microphoneStripLabel,
  type MicrophoneListeningStatus,
} from './microphone-status';

const CHAT_MESSAGES_STORAGE_KEY = 'prometeo_robotics_chat_messages_v1';
const MAX_STORED_CHAT_MESSAGES = 250;

type Tab = 'chatbot' | 'decir';
type ChatModel = 'basico' | 'complejo';

interface ChatRouteState {
  automationEnabled: boolean;
  selectedModel: ChatModel;
}

interface ChatMessage {
  from: 'user' | 'robot';
  text: string;
  timestamp: string;
  status: 'sending' | 'done' | 'error';
  fuente?: string;
  movimientos?: { id: number; name: string }[];
}

interface SentenceEntry {
  text: string;
  timestamp: string;
  status: 'sending' | 'done' | 'error';
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionCtorLike {
  new (): SpeechRecognitionLike;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  readonly length: number;
  [index: number]: { transcript?: string };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

@Component({
  selector: 'app-robotics-chat',
  imports: [FormsModule, RouterLink],
  templateUrl: './robotics-chat.html',
})
export class RoboticsChat implements OnInit, AfterViewChecked, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('decirScroll') decirScroll?: ElementRef<HTMLDivElement>;

  activeTab = signal<Tab>('chatbot');
  compact = signal(environment.compactMode);
  chatRoute = signal<ChatRouteState | null>(null);
  routeBusy = signal(false);
  readonly isAdmin = computed(() => this.auth.activeRoleName() === 'ADMIN');

  // ── Chatbot IA ──
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  chatBusy = signal(false);
  sttAvailable = signal(false);
  sttListening = signal(false);
  sttError = signal<string | null>(null);
  micStatus = signal<MicrophoneListeningStatus | null>(null);
  micPollFailed = signal(false);
  micDetailOpen = signal(false);
  private micTimer: ReturnType<typeof setInterval> | null = null;

  readonly microphoneLabel = computed(() =>
    microphoneStripLabel({ httpFailed: this.micPollFailed(), status: this.micStatus() }),
  );
  readonly microphoneLevel = computed(() =>
    buildMicrophoneLevel({ httpFailed: this.micPollFailed(), status: this.micStatus() }),
  );
  readonly microphoneDetail = computed(() =>
    buildMicrophoneDetail({ httpFailed: this.micPollFailed(), status: this.micStatus() }),
  );

  readonly chatQuickOptions: { label: string; prompt: string; icon: string }[] = [
    {
      label: 'Poema de Diana Serrano',
      prompt: 'Declara un poema para Diana Serrano, con un tono romantico y amoroso',
      icon: 'help_outline',
    },
    { label: 'Quien es tu creador?', prompt: 'Quien es tu creador?', icon: 'smart_toy' },
    {
      label: 'Porque estudiar Ingenieria de Sistemas en la Universidad Libre de Colombia?',
      prompt: 'Porque estudiar Ingenieria de Sistemas en la Universidad Libre de Colombia?',
      icon: 'smart_toy',
    },
    {
      label: 'Di un chiste',
      prompt: 'Cuenta un chiste divertido y muy comico. Siempre debe ser diferente cada vez',
      icon: 'smart_toy',
    },
  ];

  // ── Decir Oración ──
  decirInput = signal('');
  decirBusy = signal(false);
  decirHistory = signal<SentenceEntry[]>([]);
  quickPhraseSearch = signal('');
  phrases = signal<Phrase[]>([]);
  phrasesLoadError = signal(false);
  manageOpen = signal(false);
  manageBusy = signal(false);
  manageError = signal<string | null>(null);
  editingId = signal<number | null>(null);
  formTitle = signal('');
  formText = signal('');
  formIcon = signal('');
  detailPhrase = signal<Phrase | null>(null);
  decirShowHistory = signal(false);

  readonly filteredDecirQuickOptions = computed(() =>
    filterSpeakPhrases(this.phrases(), this.quickPhraseSearch()),
  );
  readonly phrasesNewestFirst = computed(() => sortPhrasesNewestFirst(this.phrases()));

  private isStoredChatMessage(value: unknown): value is ChatMessage {
    if (!value || typeof value !== 'object') return false;
    const m = value as Record<string, unknown>;
    const from = m['from'];
    const status = m['status'];
    const text = m['text'];
    const timestamp = m['timestamp'];
    const fromOk = from === 'user' || from === 'robot';
    const statusOk = status === 'done' || status === 'error' || status === 'sending';
    return fromOk && typeof text === 'string' && typeof timestamp === 'string' && statusOk;
  }

  private normalizeStoredChatMessages(list: ChatMessage[]): ChatMessage[] {
    return list.map((m) => {
      if (m.status !== 'sending') return m;
      if (m.from === 'robot') {
        return {
          ...m,
          status: 'error',
          text: 'La respuesta anterior quedó incompleta al recargar la página.',
        };
      }
      return m;
    });
  }

  private persistChatMessages() {
    try {
      const slice = this.chatMessages().slice(-MAX_STORED_CHAT_MESSAGES);
      localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(slice));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private restoreChatMessages() {
    try {
      const raw = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const list = parsed.filter((x) => this.isStoredChatMessage(x));
      this.chatMessages.set(this.normalizeStoredChatMessages(list));
    } catch {
      /* ignore */
    }
  }

  private shouldScrollChat = false;
  private shouldScrollDecir = false;
  private speechRecognition: SpeechRecognitionLike | null = null;
  private speechCtor: SpeechRecognitionCtorLike | undefined;
  private finalTranscript = '';

  now(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Chatbot ──

  sendChat() {
    const text = this.chatInput().trim();
    if (!text || this.chatBusy()) return;

    if (this.sttListening() && this.speechRecognition) {
      this.speechRecognition.stop();
    }

    const userMsg: ChatMessage = { from: 'user', text, timestamp: this.now(), status: 'done' };
    const robotMsg: ChatMessage = {
      from: 'robot',
      text: '...',
      timestamp: this.now(),
      status: 'sending',
    };

    this.chatMessages.update((msgs) => [...msgs, userMsg, robotMsg]);
    this.persistChatMessages();
    this.chatInput.set('');
    this.chatBusy.set(true);
    this.shouldScrollChat = true;

    this.http
      .post<{ reply: string; fuente?: string; movimientos?: { id: number; name: string }[] }>(
        `${GATEWAY_URL}/chat/question`,
        { message: text },
      )
      .subscribe({
      next: (res) => {
        this.chatMessages.update((msgs) =>
          msgs.map((m, i) =>
            i === msgs.length - 1
              ? {
                  ...m,
                  text: res.reply ?? 'Sin respuesta',
                  fuente: res.fuente || undefined,
                  movimientos: res.movimientos ?? [],
                  status: 'done',
                }
              : m,
          ),
        );
        this.persistChatMessages();
        this.chatBusy.set(false);
        this.shouldScrollChat = true;
      },
      error: () => {
        this.chatMessages.update((msgs) =>
          msgs.map((m, i) =>
            i === msgs.length - 1
              ? { ...m, text: 'Error al conectar con el robot.', status: 'error' }
              : m,
          ),
        );
        this.persistChatMessages();
        this.chatBusy.set(false);
        this.shouldScrollChat = true;
      },
    });
  }

  onChatKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChat();
    }
  }

  clearChat() {
    this.chatMessages.set([]);
    try {
      localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  applyChatQuick(text: string) {
    if (this.chatBusy()) return;
    this.chatInput.set(text);
    this.sendChat();
  }

  toggleChatVoiceInput() {
    if (!this.sttAvailable() || this.chatBusy()) {
      return;
    }

    this.sttError.set(null);
    if (this.sttListening()) {
      this.speechRecognition?.stop();
      return;
    }

    // Must create a fresh instance — reusing a stopped SpeechRecognition throws InvalidStateError
    this.speechRecognition = this.createRecognitionInstance();
    if (!this.speechRecognition) return;

    try {
      this.speechRecognition.start();
    } catch {
      this.sttError.set('No se pudo iniciar el dictado por voz.');
      this.sttListening.set(false);
    }
  }

  // ── Decir Oración ──

  sendDecir() {
    const text = this.decirInput().trim();
    if (!text || this.decirBusy()) return;
    this.decirInput.set('');
    this.speakDecir(text);
  }

  onDecirKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDecir();
    }
  }

  clearDecir() {
    this.decirHistory.set([]);
  }

  openDecirHistory() {
    this.decirShowHistory.set(true);
    this.shouldScrollDecir = true;
  }

  closeDecirHistory() {
    this.decirShowHistory.set(false);
  }

  applyDecirQuick(phrase: Phrase) {
    this.speakDecir(phrase.text);
  }

  openPhraseDetail(phrase: Phrase) {
    this.detailPhrase.set(phrase);
  }

  closePhraseDetail() {
    this.detailPhrase.set(null);
  }

  private speakDecir(text: string) {
    const spoken = text.trim();
    if (!spoken || this.decirBusy()) return;
    const entry: SentenceEntry = { text: spoken, timestamp: this.now(), status: 'sending' };
    this.decirHistory.update((history) => [...history, entry]);
    this.decirBusy.set(true);
    this.shouldScrollDecir = true;
    this.http.post<{ status: string }>(`${GATEWAY_URL}/voice/speak`, { message: spoken }).subscribe({
      next: () => {
        this.decirHistory.update((history) =>
          history.map((item, index) =>
            index === history.length - 1 ? { ...item, status: 'done' } : item,
          ),
        );
        this.decirBusy.set(false);
      },
      error: () => {
        this.decirHistory.update((history) =>
          history.map((item, index) =>
            index === history.length - 1 ? { ...item, status: 'error' } : item,
          ),
        );
        this.decirBusy.set(false);
      },
    });
  }

  loadPhrases() {
    this.http.get<PhraseCatalog>(`${GATEWAY_URL}/voice/phrases`).subscribe({
      next: (body) => {
        this.phrases.set(body.items ?? []);
        this.phrasesLoadError.set(false);
      },
      error: () => {
        this.phrases.set([]);
        this.phrasesLoadError.set(true);
      },
    });
  }

  openManage() {
    this.manageError.set(null);
    this.editingId.set(null);
    this.formTitle.set('');
    this.formText.set('');
    this.formIcon.set('');
    this.manageOpen.set(true);
  }

  closeManage() {
    this.manageOpen.set(false);
  }

  startEdit(phrase: Phrase) {
    this.editingId.set(phrase.id);
    this.formTitle.set(phrase.title);
    this.formText.set(phrase.text);
    this.formIcon.set(phrase.icon);
    this.manageError.set(null);
  }

  savePhrase() {
    if (this.manageBusy()) return;
    const title = this.formTitle().trim();
    const text = this.formText().trim();
    const icon = this.formIcon().trim();
    if (!title || !text) {
      this.manageError.set('Título y texto son obligatorios.');
      return;
    }
    this.manageBusy.set(true);
    const body = { title, text, icon };
    const id = this.editingId();
    const request =
      id === null
        ? this.http.post<Phrase>(`${GATEWAY_URL}/voice/phrases`, body)
        : this.http.patch<Phrase>(`${GATEWAY_URL}/voice/phrases/${id}`, body);
    request.subscribe({
      next: () => {
        this.manageBusy.set(false);
        this.editingId.set(null);
        this.formTitle.set('');
        this.formText.set('');
        this.formIcon.set('');
        this.manageError.set(null);
        this.loadPhrases();
      },
      error: () => {
        this.manageBusy.set(false);
        this.manageError.set('No se pudo guardar la frase.');
      },
    });
  }

  setPhraseActive(phrase: Phrase, active: boolean) {
    if (this.manageBusy()) return;
    this.manageBusy.set(true);
    this.http.patch<Phrase>(`${GATEWAY_URL}/voice/phrases/${phrase.id}/active`, { active }).subscribe({
      next: () => {
        this.manageBusy.set(false);
        this.loadPhrases();
      },
      error: () => {
        this.manageBusy.set(false);
        this.manageError.set('No se pudo cambiar el estado.');
      },
    });
  }

  ngOnInit() {
    this.restoreChatMessages();
    this.setupSpeechRecognition();
    this.loadChatRoute();
    this.loadPhrases();

    const params = this.route.snapshot.queryParamMap;
    if (params.get('tab') === 'decir') this.activeTab.set('decir');
    this.startMicrophoneStatusPoll();
  }

  ngOnDestroy() {
    if (this.micTimer !== null) {
      clearInterval(this.micTimer);
      this.micTimer = null;
    }
  }

  startMicrophoneStatusPoll() {
    this.refreshMicrophoneStatus();
    this.micTimer = setInterval(() => this.refreshMicrophoneStatus(), 500);
  }

  refreshMicrophoneStatus() {
    this.http.get<MicrophoneListeningStatus>(`${GATEWAY_URL}/audio/listening-status`).subscribe({
      next: (status) => {
        this.micStatus.set(status);
        this.micPollFailed.set(false);
      },
      error: () => this.micPollFailed.set(true),
    });
  }

  toggleMicrophoneDetail() {
    this.micDetailOpen.update((open) => !open);
  }

  loadChatRoute() {
    this.http.get<ChatRouteState>(`${GATEWAY_URL}/chat/route`).subscribe({
      next: (state) => this.chatRoute.set(state),
      error: () => this.chatRoute.set({ automationEnabled: true, selectedModel: 'complejo' }),
    });
  }

  setAutomation(enabled: boolean) {
    if (!this.isAdmin() || this.routeBusy()) return;
    this.routeBusy.set(true);
    this.http.patch<ChatRouteState>(`${GATEWAY_URL}/chat/route/automation`, { enabled }).subscribe({
      next: (state) => {
        this.chatRoute.set(state);
        this.routeBusy.set(false);
      },
      error: () => this.routeBusy.set(false),
    });
  }

  setModel(model: ChatModel) {
    if (this.routeBusy()) return;
    this.routeBusy.set(true);
    this.http.patch<ChatRouteState>(`${GATEWAY_URL}/chat/route/model`, { model }).subscribe({
      next: (state) => {
        this.chatRoute.set(state);
        this.routeBusy.set(false);
      },
      error: () => this.routeBusy.set(false),
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollChat && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
    if (this.shouldScrollDecir && this.decirScroll) {
      const el = this.decirScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollDecir = false;
    }
  }

  private setupSpeechRecognition() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtorLike;
      webkitSpeechRecognition?: SpeechRecognitionCtorLike;
    };

    const Ctor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Ctor) {
      this.sttAvailable.set(false);
      return;
    }

    this.speechCtor = Ctor;
    this.sttAvailable.set(true);
  }

  private createRecognitionInstance(): SpeechRecognitionLike | null {
    if (!this.speechCtor) return null;

    const recognition = new this.speechCtor();
    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.finalTranscript = this.chatInput().trim();
      this.sttListening.set(true);
      this.sttError.set(null);
    };

    recognition.onend = () => {
      this.sttListening.set(false);
    };

    recognition.onresult = (event: Event) => {
      const speechEvent = event as Event & {
        results?: ArrayLike<SpeechRecognitionResultLike>;
        resultIndex?: number;
      };

      if (!speechEvent.results) return;

      let interim = '';
      const start = speechEvent.resultIndex ?? 0;

      for (let i = start; i < speechEvent.results.length; i += 1) {
        const result = speechEvent.results[i];
        const transcript = result?.[0]?.transcript ?? '';
        if (result?.isFinal) {
          if (transcript.trim()) {
            this.finalTranscript += (this.finalTranscript ? ' ' : '') + transcript.trim();
          }
        } else {
          interim += transcript;
        }
      }

      const display = this.finalTranscript
        ? interim.trim()
          ? `${this.finalTranscript} ${interim.trim()}`
          : this.finalTranscript
        : interim.trim();
      if (display) this.chatInput.set(display);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'not-allowed') {
        this.sttError.set('Debes habilitar permisos de micrófono en el navegador.');
      } else if (event.error === 'no-speech') {
      } else {
        this.sttError.set('Falló el reconocimiento de voz.');
        this.sttListening.set(false);
      }
    };

    return recognition;
  }
}

import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { environment } from '../../../environments/environment';

type Tab = 'chatbot' | 'decir';

interface ChatMessage {
  from: 'user' | 'robot';
  text: string;
  timestamp: string;
  status: 'sending' | 'done' | 'error';
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
export class RoboticsChat implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('decirScroll') decirScroll?: ElementRef<HTMLDivElement>;

  activeTab = signal<Tab>('chatbot');
  compact   = signal(environment.compactMode);

  // ── Chatbot IA ──
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  chatBusy = signal(false);
  sttAvailable = signal(false);
  sttListening = signal(false);
  sttError = signal<string | null>(null);

  // ── Decir Oración ──
  decirInput = signal('');
  decirBusy = signal(false);
  decirHistory = signal<SentenceEntry[]>([]);

  private shouldScrollChat = false;
  private shouldScrollDecir = false;
  private speechRecognition: SpeechRecognitionLike | null = null;

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
    const robotMsg: ChatMessage = { from: 'robot', text: '...', timestamp: this.now(), status: 'sending' };

    this.chatMessages.update(msgs => [...msgs, userMsg, robotMsg]);
    this.chatInput.set('');
    this.chatBusy.set(true);
    this.shouldScrollChat = true;

    this.http.post<{ reply: string }>(`${GATEWAY_URL}/chat/question`, { message: text })
      .subscribe({
        next: res => {
          this.chatMessages.update(msgs =>
            msgs.map((m, i) => i === msgs.length - 1
              ? { ...m, text: res.reply ?? 'Sin respuesta', status: 'done' }
              : m
            )
          );
          this.chatBusy.set(false);
          this.shouldScrollChat = true;
        },
        error: () => {
          this.chatMessages.update(msgs =>
            msgs.map((m, i) => i === msgs.length - 1
              ? { ...m, text: 'Error al conectar con el robot.', status: 'error' }
              : m
            )
          );
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
  }

  toggleChatVoiceInput() {
    if (!this.speechRecognition || this.chatBusy()) {
      return;
    }

    this.sttError.set(null);
    if (this.sttListening()) {
      this.speechRecognition.stop();
      return;
    }

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

    const entry: SentenceEntry = { text, timestamp: this.now(), status: 'sending' };
    this.decirHistory.update(h => [entry, ...h]);
    this.decirInput.set('');
    this.decirBusy.set(true);
    this.shouldScrollDecir = true;

    this.http.post<{ status: string }>(`${GATEWAY_URL}/voice/speak`, { message: text })
      .subscribe({
        next: () => {
          this.decirHistory.update(h =>
            h.map((e, i) => i === 0 ? { ...e, status: 'done' } : e)
          );
          this.decirBusy.set(false);
        },
        error: () => {
          this.decirHistory.update(h =>
            h.map((e, i) => i === 0 ? { ...e, status: 'error' } : e)
          );
          this.decirBusy.set(false);
        },
      });
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

  ngOnInit() {
    this.setupSpeechRecognition();

    const params = this.route.snapshot.queryParamMap;
    if (params.get('tab') === 'decir') this.activeTab.set('decir');
  }

  ngAfterViewChecked() {
    if (this.shouldScrollChat && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
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

    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.sttListening.set(true);
      this.sttError.set(null);
    };

    recognition.onend = () => {
      this.sttListening.set(false);
    };

    recognition.onresult = (event: Event) => {
      const speechEvent = event as Event & {
        results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
        resultIndex?: number;
      };

      if (!speechEvent.results) {
        return;
      }

      const start = speechEvent.resultIndex ?? 0;
      let transcript = '';

      for (let i = start; i < speechEvent.results.length; i += 1) {
        const alt = speechEvent.results[i]?.[0];
        if (alt?.transcript) {
          transcript += `${alt.transcript} `;
        }
      }

      if (transcript.trim()) {
        this.chatInput.set(transcript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'not-allowed') {
        this.sttError.set('Debes habilitar permisos de micrófono en el navegador.');
      } else if (event.error === 'no-speech') {
        this.sttError.set('No se detectó voz. Intenta de nuevo.');
      } else {
        this.sttError.set('Falló el reconocimiento de voz.');
      }
      this.sttListening.set(false);
    };

    this.speechRecognition = recognition;
    this.sttAvailable.set(true);
  }
}

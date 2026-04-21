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

  readonly chatQuickOptions: { label: string; prompt: string; icon: string }[] = [
    { label: 'Poema de Diana Serrano',          prompt: 'Declara un poema para Diana Serrano, con un tono romantico y amoroso',              icon: 'help_outline'    },
    { label: 'Quien es tu creador?',            prompt: 'Quien es tu creador?',            icon: 'smart_toy'       },
    { label: 'Porque estudiar Ingenieria de Sistemas en la Universidad Libre de Colombia?',            prompt: 'Porque estudiar Ingenieria de Sistemas en la Universidad Libre de Colombia?',            icon: 'smart_toy'       },
    { label: 'Di un chiste',            prompt: 'Cuenta un chiste divertido y muy comico. Siempre debe ser diferente cada vez',            icon: 'smart_toy'       },
  ];

  // ── Decir Oración ──
  decirInput = signal('');
  decirBusy = signal(false);
  decirHistory = signal<SentenceEntry[]>([]);

  readonly decirQuickOptions = [
    { label: '¡Hola! ¡Bienvenido a la Feria del Libro 2026! Es un gusto recibirle en el stand de la Universidad Libre. Soy R-One, también llamado Federico, el asistente del semillero Prometeo. ¡Puede interactuar conmigo en cualquier momento! Estoy aquí para orientarle, explicarle y acompañarle en lo que necesite. ¡Adelante, pregunte con total confianza!', icon: 'menu_book' },
    { label: 'Soy R-One, también llamado Federico, el asistente del semillero Prometeo.', icon: 'menu_book' },
    { label: '¡Puede interactuar conmigo en cualquier momento! Estoy aquí para orientarle, explicarle y acompañarle en lo que necesite. ¡Adelante, pregunte con total confianza!', icon: 'menu_book' },
    { label: 'Hola, es un gusto saludarle. Puedo ayudarle con información académica, tecnológica o administrativa.', icon: 'waving_hand' },
    { label: '¡Le cuento un poco sobre mí! Soy R-One, también llamado Federico, un androide desarrollado por estudiantes de diferentes semestres de la Universidad Libre. Fui construido desde cero tomando como base la plataforma InMoov, y todas mis piezas fueron impresas en la universidad. Además, el software que me permite interactuar con usted también fue diseñado y desarrollado allí. ¡Soy el resultado del trabajo colaborativo, la innovación y el aprendizaje continuo!', icon: 'waving_hand' },
    { label: '¡Permiso! ¡Robot pasando en mi nuevo carrito! Por favor, déjeme espacio para desplazarme con seguridad.', icon: 'directions_car' },
    { label: '¡Ohh! ¡Aquí están mis creadores! Qué gusto ver al equipo que hizo posible mi desarrollo.', icon: 'groups' },
    { label: '¡Miren, padres! ¡Soy famoso! Estoy representando con orgullo a la Universidad Libre en este evento.', icon: 'star' },
    { label: '¡Hola, Yohel! Te veo desde aquí. ¿Va a hacerle mantenimiento a mi código? ¡Espero que todo esté funcionando perfectamente!', icon: 'code' },
    { label: '¡Hola, ingeniero Mauricio! Tengo entendido que usted es el director de Ingeniería de Sistemas. ¡Aquí estoy representando a la Universidad Libre con mucho orgullo! Si tienen preguntas, pueden acercarse a él o interactuar conmigo.', icon: 'school' },
    { label: '¡Marce! Le cuento que ya he avanzado hasta sexto semestre de Ingeniería de Sistemas en la Universidad Libre. ¡El aprendizaje ha sido increíble!', icon: 'psychology' },
    { label: '¡Pablo! Por favor, no me saque del semillero Prometeo. ¡Aún tengo mucho por aprender y aportar!', icon: 'science' },
    { label: '¡Juan Manuel! Necesito su ayuda, no estoy moviendo mis deditos correctamente. ¿Podría revisar mis servitos? Creo que requieren mantenimiento.', icon: 'build' },
    { label: '¡Foooootoo! ¡Sonrían, por favor! Este es un gran momento para recordar.', icon: 'photo_camera' },
    { label: '¡Hasta la vista beibi!', icon: 'waving_hand' },
    { label: '¡La familia es lo primero! Siempre es importante apoyarnos y crecer juntos.', icon: 'favorite' },
    { label: '¡Atención, por favor! El stand de la Universidad Libre se encuentra en el pabellón 3, piso 2, stand 526. ¡Le invito a visitarnos y conocer más sobre nuestros proyectos!', icon: 'location_on' },
  ];

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

  applyDecirQuick(text: string) {
    if (this.decirBusy()) return;
    this.decirInput.set(text);
    this.sendDecir();
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
        ? interim.trim() ? `${this.finalTranscript} ${interim.trim()}` : this.finalTranscript
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

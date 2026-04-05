import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { Sidebar } from '../../components/sidebar/sidebar';

export interface ChatMessage {
  id: number;
  from: 'user' | 'robot';
  text: string;
  timestamp: string;
  status?: 'sending' | 'transmitted' | 'speaking' | 'done';
}

@Component({
  selector: 'app-control-panel',
  imports: [Navbar, Footer, Sidebar, FormsModule],
  templateUrl: './control-panel.html',
})
export class ControlPanel implements AfterViewChecked {
  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLDivElement>;

  uptime = signal('14:02:55');
  cpuLoad = signal(64);
  memAlloc = signal(30);
  temperature = signal(42);
  velocity = signal(0.85);

  activeMovement = signal<string | null>(null);

  movements = [
    { label: 'Mover cabeza',   icon: 'face' },
    { label: 'Mover brazo izq', icon: 'back_hand' },
    { label: 'Mover brazo der', icon: 'back_hand' },
    { label: 'Mover torso',    icon: 'accessibility_new' },
    { label: 'Mover cadera',   icon: 'self_improvement' },
    { label: 'Mover piernas',  icon: 'directions_walk' },
  ];

  triggerMovement(mov: { label: string; icon: string }) {
    this.activeMovement.set(mov.label);
    setTimeout(() => this.activeMovement.set(null), 1500);
  }

  inputText = signal('');
  isSpeaking = signal(false);
  private msgCounter = 0;

  messages = signal<ChatMessage[]>([
    {
      id: 0,
      from: 'robot',
      text: 'Sistema de voz activo. Escribe el mensaje que deseas que transmita.',
      timestamp: '14:02:01',
      status: 'done',
    },
  ]);

  charCount = computed(() => this.inputText().length);

  private now(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  sendMessage() {
    const text = this.inputText().trim();
    if (!text) return;

    this.msgCounter++;
    const userMsg: ChatMessage = {
      id: this.msgCounter,
      from: 'user',
      text,
      timestamp: this.now(),
      status: 'sending',
    };
    this.messages.update(m => [...m, userMsg]);
    this.inputText.set('');

    // Simula transmisión → robot habla → confirma
    setTimeout(() => {
      this.messages.update(m =>
        m.map(msg => msg.id === userMsg.id ? { ...msg, status: 'transmitted' } : msg)
      );
      this.isSpeaking.set(true);

      this.msgCounter++;
      const robotMsg: ChatMessage = {
        id: this.msgCounter,
        from: 'robot',
        text: `Transmitiendo: "${text}"`,
        timestamp: this.now(),
        status: 'speaking',
      };
      this.messages.update(m => [...m, robotMsg]);

      const speakDuration = Math.min(Math.max(text.length * 60, 1500), 6000);
      setTimeout(() => {
        this.isSpeaking.set(false);
        this.messages.update(m =>
          m.map(msg => msg.id === robotMsg.id ? { ...msg, status: 'done' } : msg)
        );
      }, speakDuration);
    }, 600);
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
      id: 0,
      from: 'robot',
      text: 'Chat limpiado. Sistema de voz listo.',
      timestamp: this.now(),
      status: 'done',
    }]);
  }

  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  trackMessage(_: number, msg: ChatMessage) {
    return msg.id;
  }
}

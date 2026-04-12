import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Sidebar } from '../../components/sidebar/sidebar';
import { AuthService } from '../../core/services/auth.service';

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

const GATEWAY_URL = 'http://localhost:3000';

@Component({
  selector: 'app-robotics-chat',
  imports: [Navbar, Sidebar, FormsModule, RouterLink],
  templateUrl: './robotics-chat.html',
})
export class RoboticsChat implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('decirScroll') decirScroll?: ElementRef<HTMLDivElement>;

  activeTab = signal<Tab>('chatbot');
  compact   = signal(false);

  // ── Chatbot IA ──
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = signal('');
  chatBusy = signal(false);

  // ── Decir Oración ──
  decirInput = signal('');
  decirBusy = signal(false);
  decirHistory = signal<SentenceEntry[]>([]);

  private shouldScrollChat = false;
  private shouldScrollDecir = false;

  now(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Chatbot ──

  sendChat() {
    const text = this.chatInput().trim();
    if (!text || this.chatBusy()) return;

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
    const params = this.route.snapshot.queryParamMap;
    if (params.get('tab') === 'decir') this.activeTab.set('decir');
    if (params.get('compact') === 'true') this.compact.set(true);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollChat && this.chatScroll) {
      const el = this.chatScroll.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }
}

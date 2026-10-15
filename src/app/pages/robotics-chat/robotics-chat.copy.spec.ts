import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(import.meta.dirname, 'robotics-chat.html'), 'utf8');
const ts = readFileSync(resolve(import.meta.dirname, 'robotics-chat.ts'), 'utf8');

describe('robotics chat tabs', () => {
  it('keeps both operator tabs and the turn contract', () => {
    expect(html).toContain('Chatbot IA');
    expect(html).toContain('Decir Oración');
    expect(html).toContain("activeTab.set('chatbot')");
    expect(html).toContain("activeTab.set('decir')");
    expect(ts).toContain('/chat/question');
    expect(ts).not.toContain('chatService.chat');
  });

  it('makes inactive tabs navy-on-card and active tabs cyan', () => {
    expect(html).toContain('min-h-11');
    expect(html).toMatch(/activeTab\(\) === 'chatbot'\s*\n\s*\? 'bg-primary text-on-primary/);
    expect(html).toMatch(/activeTab\(\) === 'decir'\s*\n\s*\? 'bg-primary text-on-primary/);
    expect(html).not.toMatch(/activeTab\(\) === 'chatbot'[\s\S]{0,80}bg-secondary/);
    const tabBlock = html.slice(0, html.indexOf('CHATBOT IA'));
    expect(tabBlock).not.toContain('text-slate-400');
    expect(tabBlock).not.toContain('border-white/5');
    expect(tabBlock).toContain('text-on-surface');
    expect(tabBlock).toContain('border-outline');
  });

  it('keeps Limpiar and Enviar readable', () => {
    expect(html).not.toMatch(/clearChat[\s\S]{0,400}text-\[10px\]/);
    expect(html).not.toMatch(/sendChat\(\)[\s\S]{0,500}text-slate-600/);
    expect(html).toMatch(/sendChat\(\)[\s\S]{0,400}bg-primary/);
  });

  it('drops dark-theme leftovers that vanish on the cool paper', () => {
    expect(html).not.toMatch(/slate-\d|white\/\d|rose-\d|text-\[\d+px\]|text-outline\b|#41484d/);
  });

  it('keeps fuente, gesture name and id, and Sin movimiento in the robot bubble', () => {
    expect(html).toContain('Fuente: {{ msg.fuente }}');
    expect(html).toContain('{{ mov.name }} · {{ mov.id }}');
    expect(html).toContain('Sin movimiento');
  });
});

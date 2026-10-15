import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = import.meta.dirname;

function read(rel: string): string {
  return readFileSync(resolve(here, rel), 'utf8');
}

describe('admin chrome copy and light surfaces', () => {
  const navbar = read('../../components/navbar/navbar.html');
  const sidebar = read('../../components/sidebar/sidebar.html');
  const shell = read('admin-shell.html');
  const shellTs = read('admin-shell.ts');
  const footer = read('../../components/footer/footer.html');
  const health = read('../../components/health-status-dropdown/health-status-dropdown.html');
  const bottom = read('../../components/robotics-bottom-nav/robotics-bottom-nav.html');

  it('uses Panel and drops theater search', () => {
    expect(navbar).toMatch(/>\s*Panel\s*</);
    expect(navbar).not.toContain('Control Panel');
    expect(navbar).not.toContain('Search parameters');
    expect(shellTs).toMatch(/showSearchForRoute\(\)[^{]*\{\s*return false;/);
  });

  it('does not paint the chrome night-industrial', () => {
    for (const file of [navbar, sidebar, shell, footer, bottom]) {
      expect(file).not.toContain('slate-950');
      expect(file).not.toContain('#000f1d');
      expect(file).not.toContain('bg-black/60');
    }
  });

  it('keeps health and footer in operator Spanish', () => {
    expect(sidebar).not.toContain('Health checks');
    expect(health).toContain('border-outline');
    expect(footer).not.toContain('Unit Status: Nominal');
    expect(footer).not.toContain('bg-slate-950');
  });
});

import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'prometeo_sidebar_collapsed';

/** Estado compartido del chrome administrativo (sidebar colapsada, etc.). */
@Injectable({ providedIn: 'root' })
export class AdminChromeService {
  readonly sidebarCollapsed = signal(
    typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  );

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }
}

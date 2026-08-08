import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LanShareService {
  static readonly STORAGE_KEY = 'pmas.lanQrShown';

  readonly modalOpen = signal(false);

  shareUrl(): string {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return '';
    }
    return window.location.origin;
  }

  hasShown(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }
    return localStorage.getItem(LanShareService.STORAGE_KEY) !== null;
  }

  markShown(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(LanShareService.STORAGE_KEY, '1');
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.markShown();
  }

  maybeShowOnFirstAdminVisit(): void {
    if (this.hasShown()) {
      return;
    }
    this.openModal();
    this.markShown();
  }
}

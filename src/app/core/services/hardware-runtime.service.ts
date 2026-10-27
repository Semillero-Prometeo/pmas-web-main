import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { GATEWAY_URL } from '../constants/gateway';
import {
  IDLE_RUNTIME,
  RuntimeSnapshot,
  applyManualClose,
  applyRuntimeTick,
  normalizeSnapshot,
} from './hardware-runtime';

@Injectable({ providedIn: 'root' })
export class HardwareRuntimeService {
  private readonly http = inject(HttpClient);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;

  readonly runtime = signal<RuntimeSnapshot>(IDLE_RUNTIME);
  readonly drawerOpen = signal(false);
  readonly unreachable = signal(false);
  readonly stopError = signal<string | null>(null);
  private dismissedThisStreak = false;

  readonly playLocked = computed(() => this.unreachable() || this.runtime().busy);

  startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    this.poll();
  }

  stopPolling(): void {
    this.polling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    const next = applyManualClose({
      runtime: this.runtime(),
      drawerOpen: this.drawerOpen(),
      dismissedThisStreak: this.dismissedThisStreak,
    });
    this.drawerOpen.set(false);
    this.dismissedThisStreak = next.dismissedThisStreak;
  }

  toggleDrawer(): void {
    if (this.drawerOpen()) this.closeDrawer();
    else this.openDrawer();
  }

  stopHardware(): void {
    this.stopError.set(null);
    this.http.post(`${GATEWAY_URL}/sequence/stop`, {}).subscribe({
      next: () => {
        this.stopError.set(null);
        this.poll();
      },
      error: () => this.stopError.set('No se pudo detener'),
    });
  }

  private poll(): void {
    if (!this.polling) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.http.get<Partial<RuntimeSnapshot>>(`${GATEWAY_URL}/sequence/runtime`).subscribe({
      next: (res) => {
        if (!this.polling) return;
        this.unreachable.set(false);
        const next = applyRuntimeTick(
          {
            runtime: this.runtime(),
            drawerOpen: this.drawerOpen(),
            dismissedThisStreak: this.dismissedThisStreak,
          },
          normalizeSnapshot(res),
        );
        this.runtime.set(next.runtime);
        this.drawerOpen.set(next.drawerOpen);
        this.dismissedThisStreak = next.dismissedThisStreak;
        this.timer = setTimeout(() => this.poll(), next.runtime.busy || next.drawerOpen ? 500 : 3000);
      },
      error: () => {
        if (!this.polling) return;
        this.unreachable.set(true);
        this.timer = setTimeout(() => this.poll(), 500);
      },
    });
  }
}

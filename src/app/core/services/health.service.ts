import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GATEWAY_URL } from '../constants/gateway';

export type ServiceStatus = 'online' | 'offline' | 'checking';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private http = inject(HttpClient);

  readonly gateway    = signal<ServiceStatus>('checking');
  readonly management = signal<ServiceStatus>('checking');
  readonly robotics   = signal<ServiceStatus>('checking');

  checkAll() {
    this.check(`${GATEWAY_URL}/health`,            this.gateway);
    this.check(`${GATEWAY_URL}/management-ms/health`, this.management);
    this.check(`${GATEWAY_URL}/robotics-ms/health`,   this.robotics);
  }

  private check(url: string, target: WritableSignal<ServiceStatus>) {
    target.set('checking');
    this.http.get(url).subscribe({
      next:  () => target.set('online'),
      error: () => target.set('offline'),
    });
  }

  statusLabel(status: ServiceStatus): string {
    switch (status) {
      case 'online':   return 'Operativo';
      case 'offline':  return 'Sin respuesta';
      case 'checking': return 'Verificando...';
    }
  }
}

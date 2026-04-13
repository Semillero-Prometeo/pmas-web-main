import { Injectable, inject, signal } from '@angular/core';
import { gatewayWsUrl } from '../../core/constants/gateway';
import { AuthService } from '../../core/services/auth.service';
import {
  parseVisionServerMessage,
  type VisionClientMessage,
  type VisionSnapshotPayload,
} from './vision.types';

export type VisionConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class VisionWebSocketService {
  private readonly auth = inject(AuthService);

  readonly snapshot = signal<VisionSnapshotPayload | null>(null);
  readonly lastError = signal<string | null>(null);
  readonly connectionState = signal<VisionConnectionState>('idle');

  private socket: WebSocket | null = null;

  connect(): void {
    this.disconnect();
    this.lastError.set(null);

    const token = this.auth.token();
    const role = this.auth.activeRole();
    if (!token || !role) {
      this.lastError.set('Inicie sesión y seleccione un rol activo.');
      this.connectionState.set('error');
      return;
    }

    const url = new URL(gatewayWsUrl('/vision/ws'));
    url.searchParams.set('access_token', token);
    url.searchParams.set('activeRole', role);

    this.connectionState.set('connecting');
    const ws = new WebSocket(url.toString());
    this.socket = ws;

    ws.onopen = () => {
      this.connectionState.set('connected');
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data) as unknown;
      } catch {
        this.lastError.set('Respuesta inválida del servidor');
        return;
      }
      const msg = parseVisionServerMessage(parsed);
      if (!msg) {
        this.lastError.set('Mensaje WebSocket no reconocido');
        return;
      }
      if (msg.type === 'error') {
        this.lastError.set(msg.message);
        return;
      }
      this.lastError.set(null);
      this.snapshot.set(msg.data);
    };

    ws.onerror = () => {
      if (this.connectionState() === 'connecting') {
        this.lastError.set('No se pudo conectar al servicio de visión');
      }
      this.connectionState.set('error');
    };

    ws.onclose = () => {
      if (this.socket === ws) {
        this.socket = null;
      }
      if (this.connectionState() === 'connected') {
        this.connectionState.set('idle');
      }
    };
  }

  sendClientMessage(message: VisionClientMessage): void {
    const ws = this.socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(message));
  }

  selectCamera(cameraId: string | null): void {
    this.sendClientMessage({ type: 'setSelection', selectedCameraId: cameraId });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.snapshot.set(null);
    this.connectionState.set('idle');
  }
}

import { Component, effect, inject, signal } from '@angular/core';
import QRCode from 'qrcode';
import { LanShareService } from '../../core/services/lan-share.service';

@Component({
  selector: 'app-lan-share-modal',
  templateUrl: './lan-share-modal.html',
})
export class LanShareModal {
  readonly lanShare = inject(LanShareService);
  readonly qrDataUrl = signal<string | null>(null);
  readonly qrError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.lanShare.modalOpen()) {
        return;
      }
      const url = this.lanShare.shareUrl();
      void this.renderQr(url);
    });
  }

  private async renderQr(url: string): Promise<void> {
    if (!url) {
      this.qrDataUrl.set(null);
      this.qrError.set('No hay URL para compartir.');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 });
      this.qrDataUrl.set(dataUrl);
      this.qrError.set(null);
    } catch {
      this.qrDataUrl.set(null);
      this.qrError.set('No se pudo generar el código QR.');
    }
  }

  close(): void {
    this.lanShare.closeModal();
  }
}

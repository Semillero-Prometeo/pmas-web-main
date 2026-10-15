import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { VisionWebSocketService } from './vision-websocket.service';
import type { VisionCameraTile } from './vision.types';

@Component({
  selector: 'app-robotics-vision',
  templateUrl: './robotics-vision.html',
})
export class RoboticsVision implements OnInit, OnDestroy {
  readonly vision = inject(VisionWebSocketService);

  ngOnInit(): void {
    this.vision.connect();
  }

  ngOnDestroy(): void {
    this.vision.disconnect();
  }

  thumbDataUrl(tile: VisionCameraTile): string | null {
    if (!tile.hasFrame || !tile.thumbnailJpegBase64) return null;
    return `data:image/jpeg;base64,${tile.thumbnailJpegBase64}`;
  }

  objectImageSrc(base64: string | null): string | null {
    if (!base64) return null;
    return `data:image/jpeg;base64,${base64}`;
  }

  formatPct(conf: number): string {
    return `${Math.round(conf * 100)}%`;
  }
}

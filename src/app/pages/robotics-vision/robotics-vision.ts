import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { VisionWebSocketService } from './vision-websocket.service';
import type { VisionCameraTile } from './vision.types';

@Component({
  selector: 'app-robotics-vision',
  templateUrl: './robotics-vision.html',
})
export class RoboticsVision implements OnInit, OnDestroy {
  readonly vision = inject(VisionWebSocketService);

  readonly selectedCameraId = signal<string | null>(null);

  readonly previewSrc = computed(() => {
    const snap = this.vision.snapshot();
    const id = this.selectedCameraId();
    if (!snap || !id) return null;
    const tile = snap.cameras.find((c) => c.cameraId === id);
    if (!tile?.hasFrame) return null;
    const b64 = tile.previewJpegBase64 ?? tile.thumbnailJpegBase64;
    if (!b64) return null;
    return `data:image/jpeg;base64,${b64}`;
  });

  readonly selectedTile = computed((): VisionCameraTile | null => {
    const snap = this.vision.snapshot();
    const id = this.selectedCameraId();
    if (!snap || !id) return null;
    return snap.cameras.find((c) => c.cameraId === id) ?? null;
  });

  constructor() {
    effect(() => {
      const snap = this.vision.snapshot();
      if (!snap || this.selectedCameraId() !== null) return;
      const pick = snap.cameras.find((c) => c.hasFrame) ?? snap.cameras[0];
      if (pick) {
        untracked(() => {
          this.selectedCameraId.set(pick.cameraId);
          this.vision.selectCamera(pick.cameraId);
        });
      }
    });
  }

  ngOnInit(): void {
    this.vision.connect();
  }

  ngOnDestroy(): void {
    this.vision.disconnect();
  }

  pickCamera(cameraId: string): void {
    this.selectedCameraId.set(cameraId);
    this.vision.selectCamera(cameraId);
  }

  thumbDataUrl(tile: VisionCameraTile): string | null {
    if (!tile.hasFrame || !tile.thumbnailJpegBase64) return null;
    return `data:image/jpeg;base64,${tile.thumbnailJpegBase64}`;
  }

  formatPct(conf: number): string {
    return `${Math.round(conf * 100)}%`;
  }
}

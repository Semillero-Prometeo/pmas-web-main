import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GATEWAY_URL } from '../../core/constants/gateway';

interface ArduinoDevice {
  arduino_id: number;
  port: string;
  hardware_fingerprint: string | null;
}

interface MotionBlock {
  arduino_id: number;
  pca: number;
  servo: number;
  inicio: number;
  dur: number;
  pos: number;
  vel: number;
  nombre: string;
}

interface SequenceFile {
  name: string;
  file_name: string;
}

@Component({
  selector: 'app-sequences',
  imports: [FormsModule],
  templateUrl: './sequences.html',
})
export class Sequences {
  private http = inject(HttpClient);
  private readonly pxPerSecond = 100;

  arduinos = signal<ArduinoDevice[]>([]);
  selectedArduinoId = signal<number | null>(null);
  scannedPcas = signal<number[]>([]);
  files = signal<SequenceFile[]>([]);
  blocks = signal<MotionBlock[]>([]);
  sequenceName = signal('');
  statusMessage = signal('Listo');
  playing = signal(false);

  addPca = 0;
  addServo = 0;
  addNombre = '';

  readonly timelineSeconds = computed(() => {
    const items = this.blocks();
    const maxEnd = items.reduce((acc, item) => Math.max(acc, item.inicio + item.dur), 0);
    return Math.max(10, Math.ceil(maxEnd) + 2);
  });

  readonly timelineWidthPx = computed(() => this.timelineSeconds() * this.pxPerSecond);
  readonly timelineHeightPx = computed(() => Math.max(140, this.blocks().length * 48 + 80));
  readonly secondMarks = computed(() => Array.from({ length: this.timelineSeconds() + 1 }, (_, i) => i));

  private dragState:
    | { index: number; pointerStartX: number; originalInicio: number }
    | null = null;

  constructor() {
    this.refreshArduinos();
    this.refreshFiles();
  }

  refreshArduinos() {
    this.http.get<ArduinoDevice[]>(`${GATEWAY_URL}/sequence/arduinos`).subscribe({
      next: (arduinos) => {
        this.arduinos.set(arduinos);
        if (this.selectedArduinoId() === null && arduinos.length > 0) {
          this.selectedArduinoId.set(arduinos[0].arduino_id);
        }
      },
      error: () => this.statusMessage.set('No se pudo listar Arduinos'),
    });
  }

  scanPcas() {
    const arduinoId = this.selectedArduinoId();
    if (arduinoId === null) return;
    this.http.get<{ arduino_id: number; pcas: number[] }>(`${GATEWAY_URL}/sequence/pcas`, {
      params: { arduino_id: arduinoId },
    }).subscribe({
      next: (response) => this.scannedPcas.set(response.pcas),
      error: () => this.statusMessage.set('No se pudieron escanear PCAs'),
    });
  }

  addServoBlock() {
    const arduinoId = this.selectedArduinoId();
    if (arduinoId === null) {
      this.statusMessage.set('Selecciona un Arduino');
      return;
    }

    const nextInicio = this.blocks().reduce((acc, item) => Math.max(acc, item.inicio + 0.5), 0);
    const name = this.addNombre.trim() || `P${this.addPca}_S${this.addServo}`;
    const block: MotionBlock = {
      arduino_id: arduinoId,
      pca: this.addPca,
      servo: this.addServo,
      inicio: Math.round(nextInicio * 10) / 10,
      dur: 2,
      pos: 500,
      vel: 5,
      nombre: name,
    };
    this.blocks.update((items) => [...items, block]);
    this.addNombre = '';
  }

  removeBlock(index: number) {
    this.blocks.update((items) => items.filter((_, idx) => idx !== index));
  }

  updateBlock(index: number, patch: Partial<MotionBlock>) {
    this.blocks.update((items) =>
      items.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, ...patch };
        return {
          ...updated,
          inicio: Math.max(0, updated.inicio),
          dur: Math.max(0.1, updated.dur),
          pos: Math.min(1000, Math.max(0, updated.pos)),
          vel: Math.min(10, Math.max(1, updated.vel)),
        };
      }),
    );
  }

  playSequence() {
    const payload = { blocks: this.blocks() };
    if (!payload.blocks.length) return;
    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/play`, payload).subscribe({
      next: () => {
        this.playing.set(true);
        this.statusMessage.set('Secuencia iniciada');
      },
      error: () => this.statusMessage.set('No se pudo iniciar la secuencia'),
    });
  }

  stopSequence() {
    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/stop`, {}).subscribe({
      next: () => {
        this.playing.set(false);
        this.statusMessage.set('Secuencia detenida');
      },
      error: () => this.statusMessage.set('No se pudo detener la secuencia'),
    });
  }

  saveSequence() {
    const name = this.sequenceName().trim();
    if (!name || !this.blocks().length) {
      this.statusMessage.set('Define nombre y bloques');
      return;
    }
    this.persistSequence(name, false);
  }

  private persistSequence(name: string, overwrite: boolean) {
    const payload = {
      sequence: {
        version: 1,
        name,
        blocks: this.blocks(),
      },
      overwrite,
    };

    this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/file`, payload).subscribe({
      next: () => {
        this.refreshFiles();
        this.statusMessage.set('Secuencia guardada');
      },
      error: () => {
        if (!overwrite && confirm('La secuencia ya existe. ¿Sobrescribir?')) {
          this.persistSequence(name, true);
          return;
        }
        this.statusMessage.set('No se pudo guardar');
      },
    });
  }

  refreshFiles() {
    this.http.get<{ total: number; data: SequenceFile[] }>(`${GATEWAY_URL}/sequence/files`).subscribe({
      next: (response) => this.files.set(response.data),
      error: () => this.statusMessage.set('No se pudo listar archivos'),
    });
  }

  loadFile(fileName: string) {
    this.http.get<{ version: number; name: string; blocks: MotionBlock[] }>(`${GATEWAY_URL}/sequence/file`, {
      params: { name: fileName },
    }).subscribe({
      next: (sequence) => {
        this.sequenceName.set(sequence.name);
        this.blocks.set(sequence.blocks);
        this.statusMessage.set(`Cargada: ${sequence.name}`);
      },
      error: () => this.statusMessage.set('No se pudo cargar la secuencia'),
    });
  }

  deleteFile(fileName: string) {
    if (!confirm(`Eliminar '${fileName}'?`)) return;
    this.http.delete<{ status: string }>(`${GATEWAY_URL}/sequence/file`, {
      params: { name: fileName },
    }).subscribe({
      next: () => {
        this.refreshFiles();
        this.statusMessage.set('Secuencia eliminada');
      },
      error: () => this.statusMessage.set('No se pudo eliminar'),
    });
  }

  blockLeftPx(block: MotionBlock): number {
    return block.inicio * this.pxPerSecond;
  }

  blockWidthPx(block: MotionBlock): number {
    return block.dur * this.pxPerSecond;
  }

  startDrag(event: PointerEvent, index: number) {
    const block = this.blocks()[index];
    this.dragState = {
      index,
      pointerStartX: event.clientX,
      originalInicio: block.inicio,
    };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (!this.dragState) return;
    const deltaPx = event.clientX - this.dragState.pointerStartX;
    const deltaSeconds = deltaPx / this.pxPerSecond;
    const newInicio = Math.max(0, this.dragState.originalInicio + deltaSeconds);
    this.updateBlock(this.dragState.index, { inicio: Math.round(newInicio * 10) / 10 });
  }

  @HostListener('window:pointerup')
  onPointerUp() {
    this.dragState = null;
  }
}

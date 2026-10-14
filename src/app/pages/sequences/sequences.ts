import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { MOTION_STUDIO_URL } from '../../core/constants/motion-studio';
import { AuthService } from '../../core/services/auth.service';
import { OriginTuple, parseOriginText } from './origin-sequence';

interface ArduinoDevice {
  arduino_id: number;
  port: string;
  hardware_fingerprint: string | null;
}

interface OriginImportItem {
  sourceFileName: string;
  sourceRelativePath: string;
  targetName: string;
  description: string;
  category: string | null;
  arduino_id: number | null;
  tupleBlocks: OriginTuple[];
  tupleBlocksNeutro: OriginTuple[];
  error: string | null;
}

@Component({
  selector: 'app-sequences',
  imports: [FormsModule],
  templateUrl: './sequences.html',
})
export class Sequences {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);
  private studioFrame = viewChild<ElementRef<HTMLIFrameElement>>('studioFrame');

  studioSrc: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${MOTION_STUDIO_URL}/?embed=1`);
  studioError = signal(false);
  arduinos = signal<ArduinoDevice[]>([]);
  selectedArduinoId = signal<number | null>(null);
  statusMessage = signal('Listo');
  legacyImportOpen = signal(false);
  legacyItems = signal<OriginImportItem[]>([]);

  constructor() {
    this.refreshArduinos();
  }

  onStudioLoad() {
    this.studioError.set(false);
    this.sendAuthToStudio();
  }

  onStudioError() {
    this.studioError.set(true);
    this.statusMessage.set('El estudio de movimiento no está disponible.');
  }

  @HostListener('window:message', ['$event'])
  onParentMessage(event: MessageEvent) {
    if (event.data?.type !== 'prometeo-auth-request') return;
    try {
      if (new URL(event.origin).hostname !== window.location.hostname) return;
    } catch {
      return;
    }
    this.sendAuthToStudio();
  }

  private sendAuthToStudio() {
    const frame = this.studioFrame()?.nativeElement;
    const token = this.auth.token();
    const activeRole = this.auth.activeRole();
    if (!frame?.contentWindow || !token || !activeRole) return;
    frame.contentWindow.postMessage(
      { type: 'prometeo-auth', token, gatewayUrl: GATEWAY_URL, activeRole },
      MOTION_STUDIO_URL,
    );
  }

  openLegacyImport() {
    this.legacyImportOpen.set(true);
  }

  closeLegacyImport() {
    this.legacyImportOpen.set(false);
    this.legacyItems.set([]);
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

  onLegacyFilesSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    const selectedArduino = this.selectedArduinoId();
    const readers = Array.from(files).map((file) => this.parseOriginFile(file, selectedArduino));
    Promise.all(readers).then((items) => this.legacyItems.set(items));
  }

  updateLegacyItemName(index: number, targetName: string) {
    this.legacyItems.update((items) =>
      items.map((item, idx) => (idx === index ? { ...item, targetName } : item)),
    );
  }

  updateLegacyItemArduino(index: number, arduino_id: number) {
    this.legacyItems.update((items) =>
      items.map((item, idx) => (idx === index ? { ...item, arduino_id } : item)),
    );
  }

  importLegacyItems() {
    const items = this.legacyItems();
    const validItems = items.filter(
      (item) => item.error === null && item.arduino_id !== null && item.targetName.trim().length > 0,
    );
    if (!validItems.length) {
      this.statusMessage.set('No hay archivos legacy válidos para importar');
      return;
    }

    Promise.all(validItems.map((item) => this.importSingleOrigin(item))).then(() => {
      this.statusMessage.set('Importación legacy finalizada');
      this.closeLegacyImport();
    });
  }

  private importSingleOrigin(item: OriginImportItem): Promise<void> {
    const payload = {
      sequence: {
        name: item.targetName.trim(),
        description: item.description,
        category: item.category,
        arduino_id: item.arduino_id,
        blocks: item.tupleBlocks,
        blocks_neutro: item.tupleBlocksNeutro,
      },
      overwrite: true,
    };
    return new Promise((resolve) => {
      this.http.post<{ status: string; message: string }>(`${GATEWAY_URL}/sequence/file`, payload).subscribe({
        next: () => resolve(),
        error: () => resolve(),
      });
    });
  }

  private parseOriginFile(file: File, defaultArduinoId: number | null): Promise<OriginImportItem> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const relativePath = this.getFileRelativePath(file);
        const fileBaseName = relativePath.replace(/\.json$/i, '');
        const parsed = parseOriginText(String(reader.result ?? ''), fileBaseName, defaultArduinoId);
        resolve({
          sourceFileName: file.name,
          sourceRelativePath: relativePath,
          targetName: parsed.name,
          description: parsed.description,
          category: parsed.category,
          arduino_id: defaultArduinoId,
          tupleBlocks: parsed.blocks,
          tupleBlocksNeutro: parsed.blocksNeutro,
          error: parsed.error,
        });
      };
      reader.onerror = () => {
        const relativePath = this.getFileRelativePath(file);
        resolve({
          sourceFileName: file.name,
          sourceRelativePath: relativePath,
          targetName: relativePath.replace(/\.json$/i, ''),
          description: '',
          category: null,
          arduino_id: defaultArduinoId,
          tupleBlocks: [],
          tupleBlocksNeutro: [],
          error: 'No se pudo leer el archivo',
        });
      };
      reader.readAsText(file);
    });
  }

  private getFileRelativePath(file: File): string {
    const candidate = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    return candidate && candidate.trim().length > 0 ? candidate : file.name;
  }
}

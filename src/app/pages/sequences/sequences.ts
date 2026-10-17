import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GATEWAY_URL } from '../../core/constants/gateway';
import { MOTION_STUDIO_URL } from '../../core/constants/motion-studio';
import { AuthService } from '../../core/services/auth.service';
import { isNeutroFileName, suggestNeutroPath } from './origin-pair';
import { CATEGORIES, OriginTuple, parseOriginText } from './origin-sequence';

interface ArduinoDevice {
  arduino_id: number;
  port: string;
  hardware_fingerprint: string | null;
}

interface OriginImportItem {
  sourceFileName: string;
  sourceRelativePath: string;
  fileBaseName: string;
  kind: 'gesture' | 'neutro' | 'error';
  targetName: string;
  description: string;
  category: string | null;
  arduino_id: number | null;
  tupleBlocks: OriginTuple[];
  embeddedNeutro: OriginTuple[];
  neutroSourcePath: string | null;
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
  readonly categories = CATEGORIES;

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
    Promise.all(readers).then((incoming) => {
      const existing = this.legacyItems();
      const merged = this.mergeImportItems(existing, incoming);
      this.legacyItems.set(this.applySuggestedPairs(merged));
    });
  }

  gestureItems(): OriginImportItem[] {
    return this.legacyItems().filter((item) => item.kind === 'gesture');
  }

  neutroItems(): OriginImportItem[] {
    return this.legacyItems().filter((item) => item.kind === 'neutro');
  }

  availableNeutrosFor(index: number): OriginImportItem[] {
    const items = this.legacyItems();
    const current = items[index];
    const used = new Set(
      items
        .filter((item, idx) => idx !== index && item.kind === 'gesture' && item.neutroSourcePath)
        .map((item) => item.neutroSourcePath as string),
    );
    return this.neutroItems().filter(
      (neutro) => !used.has(neutro.sourceRelativePath) || current?.neutroSourcePath === neutro.sourceRelativePath,
    );
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

  updateLegacyItemCategory(index: number, category: string) {
    this.legacyItems.update((items) =>
      items.map((item, idx) => (idx === index ? { ...item, category } : item)),
    );
  }

  updateLegacyItemNeutro(index: number, path: string | null) {
    this.legacyItems.update((items) => {
      if (path && path !== '__embedded__') {
        const taken = items.some(
          (item, idx) => idx !== index && item.kind === 'gesture' && item.neutroSourcePath === path,
        );
        if (taken) return items;
      }
      return items.map((item, idx) => (idx === index ? { ...item, neutroSourcePath: path } : item));
    });
  }

  importLegacyItems() {
    const items = this.legacyItems();
    const validItems = items.filter(
      (item) =>
        item.kind === 'gesture' &&
        item.error === null &&
        item.category !== null &&
        item.arduino_id !== null &&
        item.targetName.trim().length > 0,
    );
    if (!validItems.length) {
      this.statusMessage.set('No hay archivos legacy válidos para importar');
      return;
    }

    Promise.all(validItems.map((item) => this.importSingleOrigin(item, items))).then(() => {
      this.statusMessage.set('Importación legacy finalizada');
    });
  }

  private resolveNeutroBlocks(item: OriginImportItem, items: OriginImportItem[]): OriginTuple[] {
    if (item.neutroSourcePath === '__embedded__') return item.embeddedNeutro;
    if (!item.neutroSourcePath) return [];
    const match = items.find(
      (candidate) => candidate.kind === 'neutro' && candidate.sourceRelativePath === item.neutroSourcePath,
    );
    return match?.tupleBlocks ?? [];
  }

  private importSingleOrigin(item: OriginImportItem, items: OriginImportItem[]): Promise<void> {
    const payload = {
      sequence: {
        name: item.targetName.trim(),
        description: item.description,
        category: item.category,
        arduino_id: item.arduino_id,
        blocks: item.tupleBlocks,
        blocks_neutro: this.resolveNeutroBlocks(item, items),
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

  private mergeImportItems(existing: OriginImportItem[], incoming: OriginImportItem[]): OriginImportItem[] {
    const byPath = new Map(existing.map((item) => [item.sourceRelativePath, item]));
    for (const item of incoming) {
      if (!byPath.has(item.sourceRelativePath)) {
        byPath.set(item.sourceRelativePath, item);
      }
    }
    return [...byPath.values()];
  }

  private applySuggestedPairs(items: OriginImportItem[]): OriginImportItem[] {
    const neutros = items.filter((item) => item.kind === 'neutro');
    const used = new Set(
      items
        .filter((item) => item.kind === 'gesture' && item.neutroSourcePath && item.neutroSourcePath !== '__embedded__')
        .map((item) => {
          const match = neutros.find((neutro) => neutro.sourceRelativePath === item.neutroSourcePath);
          return match?.fileBaseName;
        })
        .filter((name): name is string => Boolean(name)),
    );
    return items.map((item) => {
      if (item.kind !== 'gesture' || item.neutroSourcePath) return item;
      const suggested = suggestNeutroPath(
        item.fileBaseName,
        neutros.map((neutro) => neutro.fileBaseName).filter((name) => !used.has(name)),
      );
      if (!suggested) {
        return { ...item, neutroSourcePath: item.embeddedNeutro.length ? '__embedded__' : null };
      }
      used.add(suggested);
      const match = neutros.find((neutro) => neutro.fileBaseName === suggested);
      return { ...item, neutroSourcePath: match?.sourceRelativePath ?? null };
    });
  }

  private parseOriginFile(file: File, defaultArduinoId: number | null): Promise<OriginImportItem> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const relativePath = this.getFileRelativePath(file);
        const fileBaseName = relativePath.replace(/\.json$/i, '');
        const parsed = parseOriginText(String(reader.result ?? ''), fileBaseName, defaultArduinoId);
        if (parsed.error) {
          resolve({
            sourceFileName: file.name,
            sourceRelativePath: relativePath,
            fileBaseName,
            kind: 'error',
            targetName: fileBaseName,
            description: '',
            category: null,
            arduino_id: defaultArduinoId,
            tupleBlocks: [],
            embeddedNeutro: [],
            neutroSourcePath: null,
            error: parsed.error,
          });
          return;
        }
        if (isNeutroFileName(fileBaseName)) {
          resolve({
            sourceFileName: file.name,
            sourceRelativePath: relativePath,
            fileBaseName,
            kind: 'neutro',
            targetName: fileBaseName,
            description: '',
            category: null,
            arduino_id: defaultArduinoId,
            tupleBlocks: parsed.blocks,
            embeddedNeutro: [],
            neutroSourcePath: null,
            error: null,
          });
          return;
        }
        resolve({
          sourceFileName: file.name,
          sourceRelativePath: relativePath,
          fileBaseName,
          kind: 'gesture',
          targetName: parsed.name,
          description: parsed.description,
          category: parsed.category,
          arduino_id: defaultArduinoId,
          tupleBlocks: parsed.blocks,
          embeddedNeutro: parsed.blocksNeutro,
          neutroSourcePath: null,
          error: null,
        });
      };
      reader.onerror = () => {
        const relativePath = this.getFileRelativePath(file);
        const fileBaseName = relativePath.replace(/\.json$/i, '');
        resolve({
          sourceFileName: file.name,
          sourceRelativePath: relativePath,
          fileBaseName,
          kind: 'error',
          targetName: fileBaseName,
          description: '',
          category: null,
          arduino_id: defaultArduinoId,
          tupleBlocks: [],
          embeddedNeutro: [],
          neutroSourcePath: null,
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

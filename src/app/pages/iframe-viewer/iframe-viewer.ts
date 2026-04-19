import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-iframe-viewer',
  imports: [FormsModule],
  templateUrl: './iframe-viewer.html',
})
export class IframeViewer {
  private sanitizer = inject(DomSanitizer);

  pendingUrl = signal('');
  private rawSrc = signal('');
  loaded = signal(false);
  error = signal(false);

  safeSrc = computed<SafeResourceUrl | null>(() => {
    const url = this.rawSrc();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  hasSrc = computed(() => !!this.rawSrc());

  loadUrl() {
    const url = this.pendingUrl().trim();
    if (!url) return;
    this.loaded.set(false);
    this.error.set(false);
    this.rawSrc.set(url);
  }

  onLoad() { this.loaded.set(true); }
  onError() { this.error.set(true); this.loaded.set(true); }

  clear() {
    this.rawSrc.set('');
    this.pendingUrl.set('');
    this.loaded.set(false);
    this.error.set(false);
  }
}

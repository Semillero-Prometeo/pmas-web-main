import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements AfterViewInit, OnDestroy {
  private observer: MutationObserver | null = null;

  ngAfterViewInit() {
    this.markIcons();

    // Marca iconos nuevos que Angular inserte dinámicamente
    this.observer = new MutationObserver(() => this.markIcons());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private markIcons() {
    document.querySelectorAll<HTMLElement>(
      '.material-symbols-outlined:not([translate]), .material-symbols-rounded:not([translate])',
    ).forEach((el) => {
      el.setAttribute('translate', 'no');
      el.classList.add('notranslate');
    });
  }
}

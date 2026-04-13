import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  @Input() showSearch = false;

  /** `true` cuando el sitio muestra la landing y marketing con sesión iniciada. */
  readonly fullSiteMode = !environment.compactMode;

  /** Modo compacto autenticado: menú abre el drawer lateral (admin shell). */
  @Input() adminCompactLayout = false;

  /** Vista admin no compacta en viewport pequeño: mismo menú lateral (sidebar oculta bajo `md`). */
  @Input() showMobileAdminMenu = false;

  @Output() openAdminMenu = new EventEmitter<void>();

  auth = inject(AuthService);
  mobileMenuOpen = signal(false);
  profileDropdownOpen = signal(false);

  toggleProfileDropdown() {
    this.profileDropdownOpen.update(v => !v);
  }

  closeProfileDropdown() {
    this.profileDropdownOpen.set(false);
  }
}

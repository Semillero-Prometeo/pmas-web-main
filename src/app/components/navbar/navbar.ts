import { Component, Input, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  @Input() showSearch = false;

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

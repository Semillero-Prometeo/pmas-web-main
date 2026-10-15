import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, LOGIN_FLASH_KEY } from '../../core/services/auth.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, Navbar],
  templateUrl: './login.html',
})
export class Login {
  auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  loginDone = signal(false);
  sessionExpired = signal(false);

  readonly isLoading = this.auth.loading;
  readonly serverError = this.auth.error;

  constructor() {
    if (this.auth.token() && !this.auth.isAuthenticated()) {
      this.auth.logout('expired');
    }
    this.sessionExpired.set(sessionStorage.getItem(LOGIN_FLASH_KEY) === 'expired');
    sessionStorage.removeItem(LOGIN_FLASH_KEY);
  }

  handleSubmit() {
    if (!this.email() || !this.password()) return;

    this.auth.login({ username: this.email(), password: this.password() })
      .subscribe({
        next: () => {
          // Si no hay roles configurados, ir directo; si los hay, mostrar modal
          if (this.auth.availableRoles().length === 0) {
            this.router.navigate(['/control-panel']);
          } else {
            this.loginDone.set(true);
          }
        },
        error: () => { /* error ya manejado en AuthService */ },
      });
  }

  confirmRole(index: number) {
    this.auth.confirmRole(index);
    this.router.navigate(['/control-panel']);
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);

  readonly isLoading = this.auth.loading;
  readonly serverError = this.auth.error;

  handleSubmit() {
    if (!this.email() || !this.password()) return;

    this.auth.login({ username: this.email(), password: this.password() })
      .subscribe({
        next: () => this.router.navigate(['/info']),
        error: () => { /* error ya manejado en AuthService */ },
      });
  }
}

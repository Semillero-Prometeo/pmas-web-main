import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, FormsModule],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  auth = inject(AuthService);

  showChangePassword = signal(false);
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  changePasswordError = signal<string | null>(null);
  changePasswordSuccess = signal(false);

  ngOnInit() {
    this.auth.loadProfile().subscribe();
  }

  handleChangePassword() {
    const np = this.newPassword().trim();
    const cp = this.confirmPassword().trim();
    if (!np || np.length < 8) {
      this.changePasswordError.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (np !== cp) {
      this.changePasswordError.set('Las contraseñas no coinciden.');
      return;
    }
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(false);
    this.auth.changePassword(np).subscribe({
      next: () => {
        this.changePasswordSuccess.set(true);
        this.newPassword.set('');
        this.confirmPassword.set('');
        setTimeout(() => {
          this.showChangePassword.set(false);
          this.changePasswordSuccess.set(false);
        }, 2000);
      },
      error: () => {},
    });
  }
}

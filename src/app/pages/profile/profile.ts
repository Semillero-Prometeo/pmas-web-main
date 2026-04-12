import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  auth = inject(AuthService);

  ngOnInit() {
    // Refresca el perfil desde auth/me al entrar a la página
    this.auth.loadProfile().subscribe();
  }
}

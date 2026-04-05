import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, UserProfile } from '../models/auth.models';

const GATEWAY_URL = 'http://localhost:3000';
const TOKEN_KEY = 'prometeo_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _profile = signal<UserProfile | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Signals públicos de solo lectura
  readonly token = this._token.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAuthenticated = computed(() => !!this._token());
  readonly displayName = computed(() => {
    const p = this._profile()?.person;
    if (p) return `${p.first_name} ${p.last_name}`;
    return this._profile()?.username ?? '';
  });
  readonly activeRole = computed(() =>
    this._profile()?.user_role?.[0]?.role?.name ?? 'USER'
  );

  login(credentials: LoginRequest) {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .post<LoginResponse>(`${GATEWAY_URL}/auth/login`, credentials)
      .pipe(
        tap(res => {
          this._token.set(res.accessToken);
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          this._loading.set(false);
          this.loadProfile().subscribe();
        }),
        catchError((err: HttpErrorResponse) => {
          this._loading.set(false);
          this._error.set(this.parseError(err));
          return throwError(() => err);
        })
      );
  }

  loadProfile() {
    return this.http.get<UserProfile>(`${GATEWAY_URL}/auth/me`).pipe(
      tap(profile => this._profile.set(profile)),
      catchError(() => {
        this.logout();
        return throwError(() => new Error('Session expired'));
      })
    );
  }

  logout() {
    this._token.set(null);
    this._profile.set(null);
    localStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getAuthHeader(): string {
    return `Bearer ${this._token()}`;
  }

  private parseError(err: HttpErrorResponse): string {
    const msg = err.error?.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === 'string') return msg;
    if (err.status === 401) return 'Credenciales incorrectas.';
    if (err.status === 403) return 'Cuenta bloqueada. Intenta más tarde.';
    if (err.status === 0) return 'No se puede conectar al servidor.';
    return 'Error inesperado. Intenta de nuevo.';
  }
}

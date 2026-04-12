import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';
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
  private _selectedRoleIndex = signal<number>(0);
  private _roleSelected = signal(false);

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

  readonly availableRoles = computed(() =>
    this._profile()?.user_role?.map(ur => ur.role.name) ?? []
  );

  readonly activeRole = computed(() =>
    this.availableRoles()[this._selectedRoleIndex()] ?? 'USER'
  );

  /** true cuando el usuario tiene múltiples roles y aún no ha seleccionado uno en esta sesión */
  readonly needsRoleSelection = computed(() =>
    !this._roleSelected() && this.availableRoles().length > 1
  );

  login(credentials: LoginRequest) {
    this._loading.set(true);
    this._error.set(null);
    this._roleSelected.set(false);
    this._selectedRoleIndex.set(0);

    return this.http
      .post<LoginResponse>(`${GATEWAY_URL}/auth/login`, credentials)
      .pipe(
        tap(res => {
          this._token.set(res.accessToken);
          localStorage.setItem(TOKEN_KEY, res.accessToken);
        }),
        switchMap(() => this.http.get<UserProfile>(`${GATEWAY_URL}/auth/me`)),
        tap(profile => {
          this._profile.set(profile);
          this._loading.set(false);
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

  confirmRole(index: number) {
    this._selectedRoleIndex.set(index);
    this._roleSelected.set(true);
  }

  logout() {
    this._token.set(null);
    this._profile.set(null);
    this._roleSelected.set(false);
    this._selectedRoleIndex.set(0);
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

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, UserProfile, UserRole } from '../models/auth.models';

const GATEWAY_URL = 'http://localhost:3000';
const TOKEN_KEY = 'prometeo_token';
const ROLE_KEY = 'prometeo_active_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _profile = signal<UserProfile | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _activeRoleId = signal<string>(localStorage.getItem(ROLE_KEY) ?? '');
  private _roleSelected = signal(!!localStorage.getItem(ROLE_KEY));

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
    this._profile()?.user_role?.map((ur: UserRole) => ur.role.name) ?? []
  );

  /** ID del rol activo — usado en el header X-Active-Role */
  readonly activeRole = computed(() => this._activeRoleId());

  /** Nombre del rol activo — usado para mostrar en la UI */
  readonly activeRoleName = computed(() =>
    this._profile()?.user_role?.find((ur: UserRole) => ur.role.id === this._activeRoleId())?.role.name ?? ''
  );

  /** true cuando el usuario tiene múltiples roles y aún no ha seleccionado uno en esta sesión */
  readonly needsRoleSelection = computed(() =>
    !this._roleSelected() && this.availableRoles().length > 1
  );

  login(credentials: LoginRequest) {
    this._loading.set(true);
    this._error.set(null);
    this._roleSelected.set(false);
    this._activeRoleId.set('');
    localStorage.removeItem(ROLE_KEY);

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
          // Si solo tiene un rol, seleccionarlo automáticamente
          const roles = profile.user_role ?? [];
          if (roles.length === 1) {
            this._activeRoleId.set(roles[0].role.id);
            localStorage.setItem(ROLE_KEY, roles[0].role.id);
            this._roleSelected.set(true);
          }
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
    const roleId = this._profile()?.user_role?.[index]?.role.id ?? '';
    this._activeRoleId.set(roleId);
    localStorage.setItem(ROLE_KEY, roleId);
    this._roleSelected.set(true);
  }

  logout() {
    this._token.set(null);
    this._profile.set(null);
    this._roleSelected.set(false);
    this._activeRoleId.set('');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
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

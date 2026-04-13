import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'prometeo_token';

/** Mensaje devuelto por el gateway cuando la sesión en BD ya no coincide con el token. */
const INACTIVE_SESSION_MESSAGE = 'Esta sesión no se encuentra activa. Inicie sesión nuevamente';

function shouldLogoutOn401(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 401) return false;
  const body = err.error;
  if (!body || typeof body !== 'object') return false;
  const message = (body as Record<string, unknown>)['message'];
  return message === INACTIVE_SESSION_MESSAGE;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token() ?? localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return next(req).pipe(
      tap({
        error: (err) => {
          if (shouldLogoutOn401(err)) authService.logout();
        },
      }),
    );
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      'X-Active-Role': authService.activeRole(),
    },
  });

  return next(cloned).pipe(
    tap({
      error: (err) => {
        if (shouldLogoutOn401(err)) authService.logout();
      },
    }),
  );
};

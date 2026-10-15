import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'prometeo_token';

function isPublicAuthRequest(req: HttpRequest<unknown>): boolean {
  return (
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/restore-password') ||
    req.url.includes('/auth/set-password')
  );
}

function shouldLogout(err: unknown, req: HttpRequest<unknown>): boolean {
  if (isPublicAuthRequest(req)) return false;
  return err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token() ?? localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return next(req).pipe(
      tap({
        error: (err) => {
          if (shouldLogout(err, req)) authService.logout('expired');
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
        if (shouldLogout(err, req)) authService.logout('expired');
      },
    }),
  );
};

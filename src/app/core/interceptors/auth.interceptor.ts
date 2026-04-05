import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'prometeo_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token() ?? localStorage.getItem(TOKEN_KEY);

  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      'X-Active-Role': authService.activeRole(),
    },
  });

  return next(cloned);
};

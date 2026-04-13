import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Rutas solo para invitados (login/register) o páginas de marketing (info, team, projects).
 *
 * - Sin sesión: acceso permitido.
 * - Con sesión y compactMode: redirige al panel robótico (no hay landing en el flujo reducido).
 * - Con sesión y sin compacto: permite la landing; login/register redirigen a inicio.
 */
export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;

  if (environment.compactMode) {
    return router.createUrlTree(['/control-panel']);
  }

  const path = route.routeConfig?.path ?? '';
  if (path === 'login' || path === 'register') {
    return router.createUrlTree(['/info']);
  }

  return true;
};

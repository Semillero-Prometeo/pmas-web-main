import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allow = () =>
    auth.activeRoleName() === 'ADMIN' ? true : router.createUrlTree(['/control-panel']);

  if (auth.profile()) return allow();
  return auth.loadProfile().pipe(
    map(() => allow()),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

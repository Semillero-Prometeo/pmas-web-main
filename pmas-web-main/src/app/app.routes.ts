import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
  },

  // Rutas protegidas — requieren sesión activa
  {
    path: 'info',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'team',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/team/team').then(m => m.Team),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/projects/projects').then(m => m.Projects),
  },
  {
    path: 'control-panel',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/control-panel/control-panel').then(m => m.ControlPanel),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

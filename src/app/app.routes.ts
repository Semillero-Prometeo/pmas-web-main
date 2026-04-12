import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'info',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
  },

  // Páginas públicas — solo visibles sin sesión activa
  {
    path: 'info',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'team',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/team/team').then(m => m.Team),
  },
  {
    path: 'projects',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/projects/projects').then(m => m.Projects),
  },

  // Rutas protegidas — requieren sesión activa
  {
    path: 'control-panel',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/control-panel/control-panel').then(m => m.ControlPanel),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
  },
  {
    path: 'r-one',
    // Público: muestra login overlay si no hay sesión
    loadComponent: () => import('./pages/r-one/r-one').then(m => m.ROne),
  },
  {
    path: 'robotics/chat',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/robotics-chat/robotics-chat').then(m => m.RoboticsChat),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/users/users').then(m => m.Users),
  },
  {
    path: 'admin/roles',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/roles/roles').then(m => m.Roles),
  },
  {
    path: 'sequences',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sequences/sequences').then(m => m.Sequences),
  },
  {
    path: '**',
    redirectTo: 'info',
  },
];

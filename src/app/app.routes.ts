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
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },

  {
    path: 'info',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'team',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/team/team').then((m) => m.Team),
  },
  {
    path: 'projects',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/projects/projects').then((m) => m.Projects),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: 'control-panel',
        loadComponent: () => import('./pages/control-panel/control-panel').then((m) => m.ControlPanel),
        data: { sidebarActive: 'control' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
        data: { sidebarActive: null },
      },
      {
        path: 'robotics/chat',
        loadComponent: () => import('./pages/robotics-chat/robotics-chat').then((m) => m.RoboticsChat),
        data: { sidebarActive: 'chat' },
      },
      {
        path: 'robotics/vision',
        loadComponent: () => import('./pages/robotics-vision/robotics-vision').then((m) => m.RoboticsVision),
        data: { sidebarActive: 'vision' },
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./pages/admin/users/users').then((m) => m.Users),
        data: { sidebarActive: 'users' },
      },
      {
        path: 'admin/roles',
        loadComponent: () => import('./pages/admin/roles/roles').then((m) => m.Roles),
        data: { sidebarActive: 'roles' },
      },
      {
        path: 'admin/management',
        redirectTo: 'admin/users',
        pathMatch: 'full',
      },
      {
        path: 'sequences',
        loadComponent: () => import('./pages/sequences/sequences').then((m) => m.Sequences),
        data: { sidebarActive: 'telemetry' },
      },
      {
        path: 'iframe',
        loadComponent: () => import('./pages/iframe-viewer/iframe-viewer').then((m) => m.IframeViewer),
        data: { sidebarActive: 'iframe' },
      },
    ],
  },

  {
    path: 'r-one',
    loadComponent: () => import('./pages/r-one/r-one').then((m) => m.ROne),
  },
  {
    path: '**',
    redirectTo: 'info',
  },
];

import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { MainLayout } from './partials/main-layout/main-layout';

const dashboard = () => import('./screens/dashboard/dashboard').then(m => m.Dashboard);

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./screens/login/login').then(m => m.Login) },
  { path: 'recuperar-contrasena', canActivate: [guestGuard], loadComponent: () => import('./screens/recover-password/recover-password').then(m => m.RecoverPassword) },

  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },

      {
        path: 'alumno', canActivate: [roleGuard], data: { role: 'alumno' },
        children: [
          { path: 'inicio', loadComponent: dashboard },
        ],
      },
      {
        path: 'profesor', canActivate: [roleGuard], data: { role: 'profesor' },
        children: [
          { path: 'inicio', loadComponent: dashboard },
        ],
      },
      {
        path: 'admin', canActivate: [roleGuard], data: { role: 'admin' },
        children: [
          { path: 'inicio', loadComponent: dashboard },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];


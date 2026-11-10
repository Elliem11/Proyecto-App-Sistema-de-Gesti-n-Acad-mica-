import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard } from './guards/auth.guard';
import { cursoGuard } from './guards/curso.guard';
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
      // ───── ALUMNO ─────
      {
        path: 'alumno', canActivate: [roleGuard], data: { role: 'alumno' },
        children: [
          { path: 'inicio', loadComponent: dashboard },
          { path: 'horario', loadComponent: () => import('./screens/alumno/horario/horario').then(m => m.AlumnoHorario) },
          { path: 'asistencias', loadComponent: () => import('./screens/alumno/asistencias/asistencias').then(m => m.AlumnoAsistencias) },
          { path: 'avisos', loadComponent: () => import('./screens/alumno/avisos/avisos').then(m => m.AlumnoAvisos) },
          { path: 'tareas', loadComponent: () => import('./screens/alumno/tareas/tareas').then(m => m.AlumnoTareas) },
          { path: 'tareas/:id', loadComponent: () => import('./screens/alumno/tarea-detalle/tarea-detalle').then(m => m.AlumnoTareaDetalle) },
          { path: 'tareas/:id/entrega', loadComponent: () => import('./screens/alumno/entrega/entrega').then(m => m.AlumnoEntrega) },
          { path: 'calificaciones', loadComponent: () => import('./screens/alumno/calificaciones/calificaciones').then(m => m.AlumnoCalificaciones) },
          { path: 'kardex', loadComponent: () => import('./screens/alumno/kardex/kardex').then(m => m.AlumnoKardex) },
          { path: 'perfil', loadComponent: () => import('./screens/alumno/perfil/perfil').then(m => m.AlumnoPerfil) },
        ],

      },
      {
        path: 'profesor',
        canActivate: [roleGuard],
        canActivateChild: [roleGuard],
        data: { role: 'profesor' },
        children: [
          { path: 'inicio', loadComponent: dashboard },
          { path: 'cursos', loadComponent: () => import('./screens/profesor/cursos/cursos').then(m => m.MisCursos) },
          { path: 'avisos', loadComponent: () => import('./screens/profesor/avisos/avisos').then(m => m.Avisos) },
          { path: 'perfil', loadComponent: () => import('./screens/profesor/perfilma/perfilma').then(m => m.Perfilma) },
          {
            path: 'cursos/:id',
            canActivate: [cursoGuard],
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'asistencias' },
              { path: 'alumnos', loadComponent: () => import('./screens/profesor/lista-alumnos/lista-alumnos').then(m => m.ListaAlumnos) },
              { path: 'asistencias', loadComponent: () => import('./screens/profesor/asistencia-a/asistencia-a').then(m => m.PaseLista) },
              { path: 'tareas/nueva', loadComponent: () => import('./screens/profesor/crear-tarea/crear-tarea').then(m => m.CrearTarea) },
              { path: 'tareas', loadComponent: () => import('./screens/profesor/tareas/tareas').then(m => m.TareasEntregas) },
            ],
          },
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

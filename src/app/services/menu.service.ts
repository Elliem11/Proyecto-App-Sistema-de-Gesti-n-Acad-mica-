import { Injectable } from '@angular/core';
import { MenuItem, RoleInfo } from '../models/menu-item.model';
import { Role } from '../models/user.model';

const MENUS: Record<Role, MenuItem[]> = {
  alumno: [
    { label: 'Inicio', icon: 'home', route: '/alumno/inicio' },
    { label: 'Mi horario', icon: 'calendar', route: '/alumno/horario' },
    { label: 'Mis asistencias', icon: 'check', route: '/alumno/asistencias' },
    { label: 'Avisos', icon: 'bell', route: '/alumno/avisos' },
    { label: 'Mis tareas', icon: 'clipboard', route: '/alumno/tareas' },
    { label: 'Mis calificaciones', icon: 'cap', route: '/alumno/calificaciones' },
    { label: 'Kárdex', icon: 'book', route: '/alumno/kardex' },
    { label: 'Perfil', icon: 'user', route: '/alumno/perfil' },
  ],
  profesor: [
    { label: 'Inicio', icon: 'home', route: '/profesor/inicio' },
    { label: 'Mis cursos', icon: 'book', route: '/profesor/cursos' },
    { label: 'Asistencia', icon: 'check', route: '/profesor/asistencia' },
    { label: 'Tareas', icon: 'clipboard', route: '/profesor/tareas' },
    { label: 'Calificaciones', icon: 'cap', route: '/profesor/calificaciones' },
    { label: 'Perfil', icon: 'user', route: '/profesor/perfil' },
  ],
  admin: [
    { label: 'Inicio', icon: 'home', route: '/admin/inicio' },
    { label: 'Usuarios', icon: 'users', route: '/admin/usuarios' },
    { label: 'Roles y permisos', icon: 'lock', route: '/admin/roles' },
    { label: 'Materias y periodos', icon: 'book', route: '/admin/materias' },
    { label: 'Grupos', icon: 'users', route: '/admin/grupos' },
    { label: 'Inscripciones', icon: 'pen', route: '/admin/inscripciones' },
    { label: 'Reportes', icon: 'chart', route: '/admin/reportes' },
    { label: 'Bitácora', icon: 'file', route: '/admin/bitacora' },
    { label: 'Migración al Kárdex', icon: 'archive', route: '/admin/migracion-kardex' },
  ],
};

const INFO: Record<Role, RoleInfo> = {
  alumno: { label: 'Alumno', tagline: 'Portal del alumno' },
  profesor: { label: 'Profesor', tagline: 'Portal docente' },
  admin: { label: 'Administrador', tagline: 'Panel administrativo' },
};

@Injectable({ providedIn: 'root' })
export class MenuService {
  getMenu(role: Role): MenuItem[] {
    return MENUS[role];
  }
  getInfo(role: Role): RoleInfo {
    return INFO[role];
  }
}

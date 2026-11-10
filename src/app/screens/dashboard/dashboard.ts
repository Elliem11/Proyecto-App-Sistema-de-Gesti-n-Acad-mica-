
import { Component, computed, inject } from '@angular/core';
import { SHARED_IMPORTS } from '../../shared/shared_imports';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { Role } from '../../models/user.model';

const STATS: Record<Role, { label: string; value: string }[]> = {
  alumno: [
    { label: 'Tareas pendientes', value: '2' },
    { label: 'Promedio general', value: '9.3' },
    { label: 'Asistencia', value: '88%' },
  ],
  profesor: [
    { label: 'Cursos activos', value: '3' },
    { label: 'Tareas por revisar', value: '14' },
    { label: 'Alumnos a cargo', value: '84' },
  ],
  admin: [
    { label: 'Usuarios', value: '1,240' },
    { label: 'Grupos abiertos', value: '36' },
    { label: 'Inscripciones del periodo', value: '812' },
  ],
};

@Component({
  selector: 'app-dashboard',
  imports: [...SHARED_IMPORTS],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly menus = inject(MenuService);
  readonly user = inject(AuthService).session;

  readonly stats = computed(() => STATS[this.user()!.role]);
  readonly shortcuts = computed(() =>
    this.menus.getMenu(this.user()!.role).slice(1, 5)
  );

  iconKey(route: string): string {
    return route.split('/').filter(Boolean).pop() ?? '';
  }
}

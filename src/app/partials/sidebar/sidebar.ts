import { Component, computed, inject, input, output } from '@angular/core';
import { SHARED_IMPORTS } from '../../shared/shared_imports';
import { MenuService } from '../../services/menu.service';
import { ProfesorService } from '../../services/profesor.services';
import { Role } from '../../models/user.model';

@Component({
  selector: 'app-sidebar',
  imports: [...SHARED_IMPORTS],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly menus = inject(MenuService);
  private readonly profesor = inject(ProfesorService);
  readonly role = input.required<Role>();
  readonly open = input(false);
  readonly navigated = output<void>();

  readonly menu = computed(() => this.menus.getMenu(this.role(), this.profesor.cursoActivo()?.id));
  readonly info = computed(() => this.menus.getInfo(this.role()));
}

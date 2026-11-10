import { Component, computed, inject, input } from '@angular/core';
import { MenuService } from '../../services/menu.service';
import { Role } from '../../models/user.model';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly menus = inject(MenuService);
  readonly role = input.required<Role>();
  readonly info = computed(() => this.menus.getInfo(this.role()));
  readonly year = new Date().getFullYear();
}

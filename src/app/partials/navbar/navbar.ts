import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { Session } from '../../models/user.model';
import { ConfirmModal } from '../../modals/confirm-modal/confirm-modal';

@Component({
  selector: 'app-navbar',
  imports: [ConfirmModal],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menus = inject(MenuService);

  readonly user = input.required<Session>();
  readonly menuToggle = output<void>();
  readonly confirmOpen = signal(false);
  readonly roleLabel = computed(() => this.menus.getInfo(this.user().role).label);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

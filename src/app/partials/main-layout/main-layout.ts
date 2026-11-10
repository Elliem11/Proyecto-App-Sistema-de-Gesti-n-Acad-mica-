import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

/** Sidebar + navbar + footer; todo depende del rol de la sesión */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Navbar, Footer],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly user = inject(AuthService).session;
  readonly sidebarOpen = signal(false);
}

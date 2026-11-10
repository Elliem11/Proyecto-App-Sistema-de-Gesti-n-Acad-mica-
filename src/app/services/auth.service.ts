import { Injectable, computed, signal } from '@angular/core';
import { Role, Session, User } from '../models/user.model';

const STORAGE_KEY = 'gestion-academica:session';

/** Usuarios simulados*/
const USERS: User[] = [
  { id: 1, nombre: 'Elizabeth Muñoz Astorga', email: 'admin@escuela.mx', password: 'Admin123', role: 'admin' },
  { id: 2, nombre: 'Evelin Estrella Corona Matlalcuatzi', email: 'profesor@escuela.mx', password: 'Profe123', role: 'profesor' },
  { id: 3, nombre: 'Juan Perez García', email: 'alumno@escuela.mx', password: 'Alumno123', role: 'alumno' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(this.load());

  readonly session = this._session.asReadonly();
  readonly isLoggedIn = computed(() => this._session() !== null);
  readonly role = computed<Role | null>(() => this._session()?.role ?? null);

  login(email: string, password: string): { ok: boolean; error?: string } {
    const user = USERS.find(u => u.email === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    const { password: _omit, ...session } = user;
    this._session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true };
  }

  logout(): void {
    this._session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Simula el envío del enlace temporal */
  recoverPassword(email: string): boolean {
    return USERS.some(u => u.email === email.trim().toLowerCase());
  }

  homeRoute(role: Role | null = this.role()): string {
    return role ? `/${role}/inicio` : '/login';
  }

  private load(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
}

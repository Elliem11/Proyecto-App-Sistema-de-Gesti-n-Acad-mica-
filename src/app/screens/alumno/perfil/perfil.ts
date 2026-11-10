import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-alumno-perfil',
  imports: [...SHARED_IMPORTS],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class AlumnoPerfil {
  private readonly fb = inject(FormBuilder);

  readonly sent = signal(false);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  constructor() {
    const s = inject(AuthService).session();
    if (s) this.form.patchValue({ nombre: s.nombre, correo: s.email });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.sent.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Aquí irá la llamada al backend cuando exista
    this.sent.set(true);
  }
}

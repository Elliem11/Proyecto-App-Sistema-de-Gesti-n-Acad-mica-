import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-perfilma',
  imports: [...SHARED_IMPORTS],
  templateUrl: './perfilma.html',
  styleUrl: './perfilma.scss',
})
export class Perfilma {
  private readonly fb = inject(FormBuilder);

  readonly sent = signal(false);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  constructor() {
    const session = inject(AuthService).session();
    if (session) this.form.patchValue({ nombre: session.nombre, correo: session.email });
  }

  invalid(name: 'nombre' | 'correo' | 'telefono'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    this.sent.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Aquí irá la llamada al backend cuando esté disponible.
    this.sent.set(true);
  }
}

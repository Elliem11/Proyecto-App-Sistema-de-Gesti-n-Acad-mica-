import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-entrega',
  imports: [...SHARED_IMPORTS],
  templateUrl: './entrega.html',
  styleUrl: './entrega.scss',
})
export class AlumnoEntrega {
  private readonly fb = inject(FormBuilder);

  readonly sent = signal(false);
  readonly form = this.fb.nonNullable.group({
    comentarios: ['', [Validators.required, Validators.minLength(10)]],
    archivo: ['', [Validators.required]],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.form.controls.archivo.setValue(file ? file.name : '');
    this.form.controls.archivo.markAsTouched();
  }

  submit(): void {
    this.sent.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Aquí irá la llamada al backend cuando exista
    this.sent.set(true);
    this.form.reset();
  }
}

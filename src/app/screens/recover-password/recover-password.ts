import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '../../shared/shared_imports';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-recover-password',
  imports: [...SHARED_IMPORTS],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.scss',
})
export class RecoverPassword {
  private readonly auth = inject(AuthService);
  readonly sent = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.auth.recoverPassword(this.form.getRawValue().email);
    this.sent.set(true); // misma respuesta exista o no el correo
  }
}

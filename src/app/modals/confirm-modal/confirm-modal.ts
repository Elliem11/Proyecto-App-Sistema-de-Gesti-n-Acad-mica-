
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModal {
  readonly title = input('¿Confirmar?');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}

import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-avisos',
  imports: [...SHARED_IMPORTS],
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss',
})
export class AlumnoAvisos {
  readonly columns = ["Fecha", "Aviso"];
  readonly rows: string[][] = [
    ["10/11/2026", "Entrega de boletas el viernes."],
    ["12/11/2026", "Suspensión de clases por junta de consejo."],
  ];
}

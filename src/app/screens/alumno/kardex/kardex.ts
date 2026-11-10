import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-kardex',
  imports: [...SHARED_IMPORTS],
  templateUrl: './kardex.html',
  styleUrl: './kardex.scss',
})
export class AlumnoKardex {
  readonly columns = ["Periodo", "Materia", "Calificación", "Estatus"];
  readonly rows: string[][] = [
    ["2025-A", "Álgebra", "9.0", "Aprobada"],
    ["2025-B", "Física", "8.0", "Aprobada"],
    ["2026-A", "Cálculo", "7.5", "Aprobada"],
  ];
}

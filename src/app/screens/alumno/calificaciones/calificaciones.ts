import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-calificaciones',
  imports: [...SHARED_IMPORTS],
  templateUrl: './calificaciones.html',
  styleUrl: './calificaciones.scss',
})
export class AlumnoCalificaciones {
  readonly columns = ["Materia", "Parcial 1", "Parcial 2", "Promedio"];
  readonly rows: string[][] = [
    ["Matemáticas", "8.5", "9.0", "8.8"],
    ["Historia", "9.5", "9.0", "9.3"],
    ["Programación", "10", "9.5", "9.8"],
  ];
}

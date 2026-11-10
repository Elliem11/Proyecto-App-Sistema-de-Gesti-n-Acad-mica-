import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-asistencias',
  imports: [...SHARED_IMPORTS],
  templateUrl: './asistencias.html',
  styleUrl: './asistencias.scss',
})
export class AlumnoAsistencias {
  readonly columns = ["Materia", "Asistencias", "Faltas", "Porcentaje"];
  readonly rows: string[][] = [
    ["Matemáticas", "18", "2", "90%"],
    ["Historia", "19", "1", "95%"],
    ["Programación", "16", "4", "80%"],
  ];
}

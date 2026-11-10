import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-horario',
  imports: [...SHARED_IMPORTS],
  templateUrl: './horario.html',
  styleUrl: './horario.scss',
})
export class AlumnoHorario {
  readonly columns = ["Día", "Hora", "Materia", "Aula"];
  readonly rows: string[][] = [
    ["Lunes", "08:00", "Matemáticas", "A-12"],
    ["Martes", "10:00", "Historia", "B-03"],
    ["Miércoles", "11:00", "Inglés", "C-01"],
    ["Jueves", "09:00", "Programación", "Lab 2"],
  ];
}

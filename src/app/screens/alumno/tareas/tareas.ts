import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

@Component({
  selector: 'app-alumno-tareas',
  imports: [...SHARED_IMPORTS],
  templateUrl: './tareas.html',
  styleUrl: './tareas.scss',
})
export class AlumnoTareas {
  readonly columns = ["Id", "Tarea", "Materia", "Vence", "Estado"];
  readonly rows: string[][] = [
    ["1", "Ensayo de la Revolución", "Historia", "15/11/2026", "Pendiente"],
    ["2", "Ejercicios de álgebra", "Matemáticas", "18/11/2026", "Pendiente"],
    ["3", "CRUD en Angular", "Programación", "20/11/2026", "Entregada"],
  ];
}

import { Component, computed, input } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared_imports';

interface Tarea { titulo: string; materia: string; vence: string; estado: string; descripcion: string; }

const TAREAS: Record<string, Tarea> = {
  '1': { titulo: 'Ensayo de la Revolución', materia: 'Historia', vence: '15/11/2026', estado: 'Pendiente', descripcion: 'Escribe un ensayo de dos cuartillas sobre las causas de la Revolución.' },
  '2': { titulo: 'Ejercicios de álgebra', materia: 'Matemáticas', vence: '18/11/2026', estado: 'Pendiente', descripcion: 'Resuelve los ejercicios 1 al 15 de la página 82.' },
  '3': { titulo: 'CRUD en Angular', materia: 'Programación', vence: '20/11/2026', estado: 'Entregada', descripcion: 'Entrega un CRUD funcional con validaciones de formulario.' },
};

@Component({
  selector: 'app-alumno-tarea-detalle',
  imports: [...SHARED_IMPORTS],
  templateUrl: './tarea-detalle.html',
  styleUrl: './tarea-detalle.scss',
})
export class AlumnoTareaDetalle {
  /** Llega desde la ruta :id (withComponentInputBinding) */
  readonly id = input<string>('');
  readonly tarea = computed(() => TAREAS[this.id()] ?? null);
}

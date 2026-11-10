import { computed, Injectable, signal } from '@angular/core';
import {
  Alumno,
  Curso,
  EstadoAsistencia,
  ProgresoCurso,
  SesionAsistencia,
} from '../models/profesor.models';

// ============ Datos dummy (reemplaza por HttpClient cuando exista el back) ============
const alumnos = (inicio: number, lista: [string, string][]): Alumno[] =>
  lista.map(([matricula, nombre], i) => ({ id: inicio + i, matricula, nombre }));

const PROG_WEB = alumnos(1, [
  ['20232001', 'Astorga Elizabeth'],
  ['20232002', 'Corona Evelin'],
  ['20232003', 'García Luis'],
  ['20232004', 'Martínez Sofía'],
  ['20232005', 'Hernández Diego'],
  ['20232006', 'López Valeria'],
  ['20232007', 'Ramírez Mateo'],
  ['20232008', 'Torres Camila'],
  ['20232009', 'Flores Jorge'],
  ['20232010', 'Vargas Fernanda'],
]);

const BASES = alumnos(11, [
  ['20232011', 'Mendoza Paola'],
  ['20232012', 'Luna Andrés'],
  ['20232013', 'Reyes Daniela'],
  ['20232014', 'Salazar Mateo'],
  ['20232015', 'Lara Camila'],
  ['20232016', 'Ríos Emilio'],
]);

const ALGEBRA = alumnos(21, [
  ['20232021', 'Cruz Ximena'],
  ['20232022', 'Ortiz Santiago'],
  ['20232023', 'Núñez Regina'],
  ['20232024', 'Castillo Iván'],
  ['20232025', 'Peña Julia'],
  ['20232026', 'Rojas Bruno'],
  ['20232027', 'Silva Renata'],
  ['20232028', 'Vega Leonardo'],
]);

/** Crea una sesión: todos "presente" salvo las listas de faltas y justificadas (por id de alumno). */
const sesion = (
  lista: Alumno[],
  fecha: string,
  hora: string,
  modalidad: 'presencial' | 'virtual',
  faltas: number[],
  justificadas: number[] = [],
): SesionAsistencia => ({
  fecha,
  hora,
  modalidad,
  registros: lista.map((a) => {
    const estado: EstadoAsistencia = faltas.includes(a.id) ? 'falta' : justificadas.includes(a.id) ? 'justificada' : 'presente';
    return { alumnoId: a.id, estado, motivo: estado === 'justificada' ? 'Cita médica (justificante entregado)' : '' };
  }),
});

const CURSOS: Curso[] = [
  {
    id: 1, nombre: 'Programación Web', clave: 'TIC-310', grupo: '102', periodo: 'Otoño 2026',
    horario: 'Ma-Ju 10:00 - 12:00', modalidad: 'virtual', lugar: 'Enlace virtual',
    alumnos: PROG_WEB,
    evaluaciones: [
      { id: 1, nombre: 'Examen parcial 1', peso: 30, publicada: true },
      { id: 2, nombre: 'Tareas', peso: 25, publicada: false },
      { id: 3, nombre: 'Proyecto final', peso: 45, publicada: false },
    ],
    sesiones: [
      sesion(PROG_WEB, '2026-11-03', '10:03', 'virtual', [3, 7], [5]),
      sesion(PROG_WEB, '2026-11-05', '10:01', 'virtual', [3]),
      sesion(PROG_WEB, '2026-11-09', '10:05', 'virtual', [3, 9], [7]),
    ],
  },
  {
    id: 2, nombre: 'Bases de Datos', clave: 'TIC-320', grupo: '103', periodo: 'Otoño 2026',
    horario: 'Lu-Mi 12:00 - 14:00', modalidad: 'presencial', lugar: 'Laboratorio B',
    alumnos: BASES,
    evaluaciones: [
      { id: 4, nombre: 'Examen parcial 1', peso: 40, publicada: true },
      { id: 5, nombre: 'Prácticas SQL', peso: 30, publicada: true },
      { id: 6, nombre: 'Proyecto final', peso: 30, publicada: true },
    ],
    sesiones: [
      sesion(BASES, '2026-11-02', '12:02', 'presencial', [12]),
      sesion(BASES, '2026-11-04', '12:00', 'presencial', [12, 15]),
      sesion(BASES, '2026-11-09', '12:04', 'presencial', [12], [14]),
    ],
  },
  {
    id: 3, nombre: 'Álgebra Lineal', clave: 'MAT-110', grupo: '101', periodo: 'Otoño 2026',
    horario: 'Lu-Mi 08:00 - 10:00', modalidad: 'presencial', lugar: 'Aula 104',
    alumnos: ALGEBRA,
    evaluaciones: [], // sin evaluaciones: aparece como "Sin evaluaciones"
    sesiones: [],
  },
];

/** Datos de los cursos del profesor. Un solo lugar para reemplazar por la API. */
@Injectable({ providedIn: 'root' })
export class ProfesorService {
  private readonly _cursos = signal<Curso[]>(CURSOS);
  private readonly cursoId = signal<number | null>(null);

  readonly cursos = this._cursos.asReadonly();

  /** Curso de la ruta /profesor/cursos/:id/... (lo fija `cursoGuard`). */
  readonly cursoActivo = computed(() => this._cursos().find((c) => c.id === this.cursoId()));

  existeCurso(id: number): boolean {
    return this._cursos().some((c) => c.id === id);
  }

  seleccionarCurso(id: number | null): void {
    this.cursoId.set(id);
  }

  /** Sin evaluaciones => "configurar"; con alguna sin publicar => "captura"; todas publicadas => "publicado". */
  progreso(curso: Curso): ProgresoCurso {
    const total = curso.evaluaciones.length;
    const publicadas = curso.evaluaciones.filter((e) => e.publicada).length;
    const pesoTotal = curso.evaluaciones.reduce((suma, e) => suma + e.peso, 0);
    const columna = total === 0 ? 'configurar' : publicadas === total ? 'publicado' : 'captura';
    return { columna, total, publicadas, pesoTotal };
  }

  /** % de asistencia del alumno; la falta justificada cuenta como asistencia. `null` si aún no hay sesiones. */
  porcentajeAsistencia(cursoId: number, alumnoId: number): number | null {
    const curso = this._cursos().find((c) => c.id === cursoId);
    if (!curso) return null;
    const registros = curso.sesiones
      .map((s) => s.registros.find((r) => r.alumnoId === alumnoId))
      .filter((r) => r !== undefined);
    if (registros.length === 0) return null;
    const asistidas = registros.filter((r) => r.estado !== 'falta').length;
    return Math.round((asistidas / registros.length) * 100);
  }
}

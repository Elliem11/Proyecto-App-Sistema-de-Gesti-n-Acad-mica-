export type Modalidad = 'presencial' | 'virtual';
export type EstadoAsistencia = 'presente' | 'falta' | 'justificada';

/** Avance de las evaluaciones del curso (etiqueta en "Mis cursos"). */
export type ColumnaCurso = 'configurar' | 'captura' | 'publicado';

/** % mínimo de asistencia; por debajo de esto el alumno aparece "en riesgo" (HU-02). */
export const MINIMO_ASISTENCIA = 80;

export interface Alumno {
  id: number;
  matricula: string;
  nombre: string;
}

export interface Evaluacion {
  id: number;
  nombre: string;
  peso: number; // la suma de pesos del curso debe ser 100 (HU-06)
  publicada: boolean;
}

export interface RegistroAsistencia {
  alumnoId: number;
  estado: EstadoAsistencia;
  motivo: string;
}

export interface SesionAsistencia {
  fecha: string; // yyyy-MM-dd
  hora: string; // HH:mm
  modalidad: Modalidad;
  registros: RegistroAsistencia[];
  modificadoPor?: string; // HU-21
  modificadoEn?: string;
}

export interface Curso {
  id: number;
  nombre: string;
  clave: string;
  grupo: string;
  periodo: string;
  horario: string;
  modalidad: Modalidad;
  lugar: string; // aula o enlace virtual
  alumnos: Alumno[];
  evaluaciones: Evaluacion[];
  sesiones: SesionAsistencia[];
}

export interface ProgresoCurso {
  columna: ColumnaCurso;
  total: number; // evaluaciones definidas
  publicadas: number;
  pesoTotal: number;
}

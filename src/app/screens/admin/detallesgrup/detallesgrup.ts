import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';

// ---------- Tipos ----------
export type Dia = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
export type Modalidad = 'presencial' | 'virtual';

export interface Sesion { dia: Dia; inicio: string; fin: string; } // 'HH:mm'

export interface Grupo {
  id: number;
  clave: string;
  materia: string;
  creditos: number;
  grupo: string;
  periodo: string;
  carrera: string;
  profesor: { nombre: string; correo: string };
  modalidad: Modalidad;
  aula: string | null;
  enlace: string | null; // sesión virtual
  horario: Sesion[];
  estado: 'abierto' | 'cerrado';
  minAsistencia: number; // % mínimo configurado (por defecto institucional: 80)
  descripcion: string | null; // la complementa el profesor
  temario: string[]; // la complementa el profesor
  evaluaciones: { nombre: string; peso: number }[];
}

export interface Inscrito {
  id: number;
  nombre: string;
  matricula: string;
  carrera: string;
  inscritoEn: string; // ISO
  asistencia: number | null; // % (null = aún sin sesiones registradas)
}

interface AlumnoDirectorio {
  id: number;
  nombre: string;
  matricula: string;
  carrera: string;
  horario: Sesion[]; // horario de sus otros grupos del periodo
}

interface Aviso { tipo: 'ok' | 'error' | 'info'; texto: string; }

@Component({
  selector: 'app-detalles-grupo',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './detallesgrup.html',
  styleUrl: './detallesgrup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetallesGrupo {
  private readonly route = inject(ActivatedRoute);

  readonly columns = ['Alumno', 'Carrera', 'Inscrito el', 'Asistencia', 'Acciones'];

  // Rutas que usa la vista (ajústalas a las de tu app)
  readonly rutaLista = ['/admin/grupos'];

  readonly cargando = signal(true);
  readonly noEncontrado = signal(false);
  readonly aviso = signal<Aviso | null>(null);

  // TODO: reemplazar los datos de ejemplo por la respuesta del servidor.
  // El servidor es quien debe validar duplicados y traslapes al inscribir (RNF-03),
  // y quien debe registrar altas y bajas en el historial y en la bitácora.
  readonly grupo = signal<Grupo | null>(null);
  readonly inscritos = signal<Inscrito[]>([]);
  private readonly directorio: AlumnoDirectorio[] = DIRECTORIO_EJEMPLO;

  // ---------- Controles (se crean una sola vez) ----------
  readonly matriculaCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly buscarCtrl = new FormControl('', { nonNullable: true });
  private readonly textoBuscar = toSignal(
    this.buscarCtrl.valueChanges.pipe(map((v) => v.trim()), startWith('')),
    { initialValue: '' },
  );

  // Baja en dos pasos: primero se marca al alumno, luego se confirma.
  readonly bajaPendiente = signal<number | null>(null);

  // ---------- Derivados ----------
  readonly cerrado = computed(() => this.grupo()?.estado === 'cerrado');

  readonly visibles = computed(() => {
    const q = normalizar(this.textoBuscar());
    const lista = this.inscritos();
    if (!q) return lista;
    return lista.filter((a) => normalizar(`${a.nombre} ${a.matricula}`).includes(q));
  });

  readonly resumen = computed(() => {
    const g = this.grupo();
    const lista = this.inscritos();
    const conDato = lista.filter((a) => a.asistencia !== null);
    const promedio = conDato.length
      ? Math.round((conDato.reduce((s, a) => s + (a.asistencia ?? 0), 0) / conDato.length) * 10) / 10
      : null;
    return {
      inscritos: lista.length,
      enRiesgo: g ? lista.filter((a) => this.enRiesgo(a)).length : 0,
      promedioAsistencia: promedio,
    };
  });

  readonly sumaPesos = computed(() => (this.grupo()?.evaluaciones ?? []).reduce((s, e) => s + e.peso, 0));

  constructor() {
    this.cargar();
  }

  // ---------- Carga ----------
  private cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    // TODO: pedir el grupo `id` al servidor. Con datos de ejemplo solo se simula.
    if (Number.isNaN(id)) {
      this.noEncontrado.set(true);
      this.cargando.set(false);
      return;
    }
    this.grupo.set({ ...GRUPO_EJEMPLO, id: id || GRUPO_EJEMPLO.id });
    this.inscritos.set(INSCRITOS_EJEMPLO.map((a) => ({ ...a })));
    this.cargando.set(false);
  }

  // ---------- Inscribir ----------
  inscribir(): void {
    const g = this.grupo();
    if (!g) return;

    if (this.cerrado()) {
      this.aviso.set({ tipo: 'error', texto: 'El curso está cerrado: no se pueden inscribir alumnos.' });
      return;
    }
    if (this.matriculaCtrl.invalid) {
      this.matriculaCtrl.markAsTouched();
      return;
    }

    const matricula = this.matriculaCtrl.value.trim();
    const alumno = this.directorio.find((a) => a.matricula === matricula);

    if (!alumno) {
      this.aviso.set({ tipo: 'error', texto: `No existe un alumno con la matrícula ${matricula}.` });
      return;
    }
    if (this.inscritos().some((i) => i.matricula === matricula)) {
      this.aviso.set({ tipo: 'error', texto: `${alumno.nombre} ya está inscrito en este grupo.` });
      return;
    }
    const choque = this.buscarTraslape(g.horario, alumno.horario);
    if (choque) {
      this.aviso.set({
        tipo: 'error',
        texto: `${alumno.nombre} tiene otro grupo en el mismo horario (${choque.dia} ${choque.inicio}–${choque.fin}).`,
      });
      return;
    }

    const nuevo: Inscrito = {
      id: alumno.id,
      nombre: alumno.nombre,
      matricula: alumno.matricula,
      carrera: alumno.carrera,
      inscritoEn: new Date().toISOString(),
      asistencia: null,
    };
    this.inscritos.update((lista) => [...lista, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    this.matriculaCtrl.reset();
    this.aviso.set({ tipo: 'ok', texto: `${alumno.nombre} quedó inscrito en el grupo.` });
  }

  // ---------- Dar de baja ----------
  pedirBaja(id: number): void {
    this.aviso.set(null);
    this.bajaPendiente.set(id);
  }

  cancelarBaja(): void {
    this.bajaPendiente.set(null);
  }

  confirmarBaja(): void {
    const id = this.bajaPendiente();
    if (id === null) return;
    const alumno = this.inscritos().find((a) => a.id === id);
    this.inscritos.update((lista) => lista.filter((a) => a.id !== id));
    this.bajaPendiente.set(null);
    if (alumno) {
      this.aviso.set({ tipo: 'ok', texto: `Baja de ${alumno.nombre} registrada en su historial.` });
    }
  }

  // ---------- Ayudas para la vista ----------
  enRiesgo(a: Inscrito): boolean {
    const min = this.grupo()?.minAsistencia ?? 80;
    return a.asistencia !== null && a.asistencia < min;
  }

  formatoHorario(s: Sesion): string {
    return `${s.dia.slice(0, 3)} ${s.inicio}–${s.fin}`;
  }

  private buscarTraslape(propio: Sesion[], otro: Sesion[]): Sesion | null {
    for (const a of propio) {
      for (const b of otro) {
        if (a.dia === b.dia && minutos(a.inicio) < minutos(b.fin) && minutos(b.inicio) < minutos(a.fin)) {
          return b;
        }
      }
    }
    return null;
  }
}

// ---------- Utilidades ----------
function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ---------- Datos de ejemplo (borrar al conectar el servicio) ----------
const GRUPO_EJEMPLO: Grupo = {
  id: 1,
  clave: 'ICC-201',
  materia: 'Bases de datos',
  creditos: 8,
  grupo: '2',
  periodo: 'Otoño 2026',
  carrera: 'Ing. en Ciencias de la Computación',
  profesor: { nombre: 'Jorge Salazar', correo: 'jorge.salazar@correo.edu.mx' },
  modalidad: 'presencial',
  aula: 'Edificio 1CC2 · Aula 105',
  enlace: 'https://meet.example.com/bd-grupo2',
  horario: [
    { dia: 'Lunes', inicio: '09:00', fin: '11:00' },
    { dia: 'Miércoles', inicio: '09:00', fin: '11:00' },
  ],
  estado: 'abierto',
  minAsistencia: 80,
  descripcion: 'Diseño, normalización y consulta de bases de datos relacionales con SQL.',
  temario: ['Modelo entidad-relación', 'Modelo relacional y normalización', 'SQL: consultas y subconsultas', 'Transacciones y concurrencia'],
  evaluaciones: [
    { nombre: 'Examen parcial 1', peso: 25 },
    { nombre: 'Examen parcial 2', peso: 25 },
    { nombre: 'Tareas', peso: 20 },
    { nombre: 'Proyecto final', peso: 30 },
  ],
};

const INSCRITOS_EJEMPLO: Inscrito[] = [
  { id: 1, nombre: 'Ana Torres', matricula: '202145678', carrera: 'Ing. en Ciencias de la Computación', inscritoEn: '2026-08-10T10:00:00', asistencia: 96 },
  { id: 2, nombre: 'Carlos Mejía', matricula: '202145912', carrera: 'Ing. en Ciencias de la Computación', inscritoEn: '2026-08-10T10:05:00', asistencia: 72 },
  { id: 3, nombre: 'Elena Soto', matricula: '202144301', carrera: 'Ing. en Tecnologías de la Información', inscritoEn: '2026-08-11T09:30:00', asistencia: 88 },
  { id: 4, nombre: 'Iván Rojas', matricula: '202146120', carrera: 'Ing. en Ciencias de la Computación', inscritoEn: '2026-08-11T12:15:00', asistencia: 64 },
  { id: 5, nombre: 'Valeria Cruz', matricula: '202143877', carrera: 'Ing. en Tecnologías de la Información', inscritoEn: '2026-08-12T08:45:00', asistencia: 100 },
  { id: 6, nombre: 'Sofía Vega', matricula: '202145004', carrera: 'Ing. en Ciencias de la Computación', inscritoEn: '2026-08-12T11:00:00', asistencia: null },
];

const DIRECTORIO_EJEMPLO: AlumnoDirectorio[] = [
  { id: 10, nombre: 'Pedro Núñez', matricula: '202147001', carrera: 'Ing. en Ciencias de la Computación', horario: [{ dia: 'Martes', inicio: '09:00', fin: '11:00' }] },
  { id: 11, nombre: 'Luis Ramírez', matricula: '202147002', carrera: 'Ing. en Tecnologías de la Información', horario: [{ dia: 'Lunes', inicio: '10:00', fin: '12:00' }] },
  { id: 12, nombre: 'Marta Díaz', matricula: '202147003', carrera: 'Ing. en Ciencias de la Computación', horario: [] },
];

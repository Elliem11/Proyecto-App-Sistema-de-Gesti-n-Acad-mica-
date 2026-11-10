import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { Dia, Modalidad, Sesion } from '../detallesgrup/detallesgrup';

// ---------- Tipos ----------
export interface GrupoLista {
  id: number;
  materiaId: number;
  periodoId: number;
  profesorId: number;
  grupo: string;
  modalidad: Modalidad;
  aula: string | null;
  enlace: string | null;
  horario: Sesion[];
  inscritos: number;
  estado: 'abierto' | 'cerrado';
}

interface Materia { id: number; clave: string; nombre: string; creditos: number; }
interface Periodo { id: number; nombre: string; }
interface Profesor { id: number; nombre: string; }

interface Aviso { tipo: 'ok' | 'error' | 'info'; texto: string; }

const DIAS: Dia[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ---------- Validadores ----------
// Presencial exige aula; virtual exige enlace (RF-07).
const lugarRequerido: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const modalidad = c.get('modalidad')?.value as Modalidad | undefined;
  const aula = String(c.get('aula')?.value ?? '').trim();
  const enlace = String(c.get('enlace')?.value ?? '').trim();
  const errores: ValidationErrors = {};
  if (modalidad === 'presencial' && !aula) errores['aulaFaltante'] = true;
  if (modalidad === 'virtual' && !enlace) errores['enlaceFaltante'] = true;
  return Object.keys(errores).length ? errores : null;
};

// La hora de fin debe ser posterior a la de inicio.
const rangoHorario: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const inicio = String(c.get('inicio')?.value ?? '');
  const fin = String(c.get('fin')?.value ?? '');
  if (!inicio || !fin) return null;
  return minutos(fin) > minutos(inicio) ? null : { rango: true };
};

@Component({
  selector: 'app-lista-grupos',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lista-grupos.html',
  styleUrl: './lista-grupos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaGrupos {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly columns = ['Grupo', 'Profesor', 'Horario', 'Modalidad', 'Inscritos', 'Acciones'];
  readonly dias = DIAS;

  // TODO: reemplazar los catálogos y los grupos de ejemplo por la respuesta del servidor.
  // El servidor debe repetir las validaciones de duplicado y traslape (RNF-03).
  readonly materias: Materia[] = MATERIAS_EJEMPLO;
  readonly periodos: Periodo[] = PERIODOS_EJEMPLO;
  readonly profesores: Profesor[] = PROFESORES_EJEMPLO;
  private readonly periodoActual = String(PERIODOS_EJEMPLO[0].id);

  readonly grupos = signal<GrupoLista[]>(GRUPOS_EJEMPLO.map((g) => ({ ...g, horario: g.horario.map((s) => ({ ...s })) })));
  readonly aviso = signal<Aviso | null>(null);

  // ---------- Filtros ----------
  readonly filtros = this.fb.group({
    busqueda: '',
    periodo: this.periodoActual,
    modalidad: '',
    estado: '',
  });

  private readonly valores = toSignal(
    this.filtros.valueChanges.pipe(
      map(() => this.filtros.getRawValue()),
      startWith(this.filtros.getRawValue()),
    ),
    { initialValue: this.filtros.getRawValue() },
  );

  readonly hayFiltros = computed(() => {
    const v = this.valores();
    return !!v.busqueda || !!v.modalidad || !!v.estado || v.periodo !== this.periodoActual;
  });

  // Solo filtra: no crea controles ni objetos de formulario.
  readonly visibles = computed(() => {
    const { busqueda, periodo, modalidad, estado } = this.valores();
    const q = normalizar(busqueda.trim());
    return this.grupos().filter((g) => {
      if (periodo && String(g.periodoId) !== periodo) return false;
      if (modalidad && g.modalidad !== modalidad) return false;
      if (estado && g.estado !== estado) return false;
      if (q) {
        const m = this.materia(g.materiaId);
        const texto = normalizar(`${m?.nombre ?? ''} ${m?.clave ?? ''} ${this.nombreProfesor(g.profesorId)} ${g.grupo}`);
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });

  readonly resumen = computed(() => {
    const lista = this.visibles();
    return {
      grupos: lista.length,
      abiertos: lista.filter((g) => g.estado === 'abierto').length,
      inscritos: lista.reduce((s, g) => s + g.inscritos, 0),
    };
  });

  // ---------- Formulario de crear / editar (se crea una sola vez) ----------
  readonly formAbierto = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly errorGuardado = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      materiaId: this.fb.control<number | null>(null, Validators.required),
      periodoId: this.fb.control<number | null>(Number(this.periodoActual), Validators.required),
      grupo: ['', [Validators.required, Validators.maxLength(10)]],
      profesorId: this.fb.control<number | null>(null, Validators.required),
      modalidad: this.fb.control<Modalidad>('presencial'),
      aula: ['', Validators.maxLength(80)],
      enlace: ['', [Validators.maxLength(300), Validators.pattern(/^https?:\/\/\S+$/i)]],
      sesiones: this.fb.array([this.crearSesion()], Validators.minLength(1)),
    },
    { validators: [lugarRequerido] },
  );

  get sesiones() {
    return this.form.controls.sesiones;
  }

  readonly titulo = computed(() => (this.editandoId() === null ? 'Nuevo grupo' : 'Editar grupo'));

  // ---------- Abrir / cerrar formulario ----------
  abrirNuevo(): void {
    this.prepararForm();
    this.editandoId.set(null);
    this.sesiones.push(this.crearSesion());
    this.formAbierto.set(true);
  }

  abrirEditar(g: GrupoLista): void {
    this.prepararForm();
    this.editandoId.set(g.id);
    g.horario.forEach((s) => this.sesiones.push(this.crearSesion(s)));
    this.form.patchValue({
      materiaId: g.materiaId,
      periodoId: g.periodoId,
      grupo: g.grupo,
      profesorId: g.profesorId,
      modalidad: g.modalidad,
      aula: g.aula ?? '',
      enlace: g.enlace ?? '',
    });
    this.formAbierto.set(true);
  }

  cancelar(): void {
    this.formAbierto.set(false);
    this.errorGuardado.set(null);
  }

  private prepararForm(): void {
    this.aviso.set(null);
    this.errorGuardado.set(null);
    this.sesiones.clear();
    this.form.reset();
  }

  // ---------- Sesiones ----------
  agregarSesion(): void {
    this.sesiones.push(this.crearSesion());
  }

  quitarSesion(i: number): void {
    if (this.sesiones.length > 1) this.sesiones.removeAt(i);
  }

  private crearSesion(s?: Sesion) {
    return this.fb.group(
      {
        dia: this.fb.control<Dia>(s?.dia ?? 'Lunes'),
        inicio: [s?.inicio ?? '', Validators.required],
        fin: [s?.fin ?? '', Validators.required],
      },
      { validators: [rangoHorario] },
    );
  }

  // ---------- Guardar ----------
  guardar(): void {
    this.errorGuardado.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    if (v.materiaId === null || v.periodoId === null || v.profesorId === null) return;

    const id = this.editandoId();
    const nombreGrupo = v.grupo.trim();
    const horario: Sesion[] = v.sesiones.map((s) => ({ dia: s.dia, inicio: s.inicio, fin: s.fin }));

    // Mismo grupo ya existe para esa materia y periodo
    const duplicado = this.grupos().some(
      (g) =>
        g.id !== id &&
        g.materiaId === v.materiaId &&
        g.periodoId === v.periodoId &&
        g.grupo.toLowerCase() === nombreGrupo.toLowerCase(),
    );
    if (duplicado) {
      this.errorGuardado.set(`Ya existe el grupo ${nombreGrupo} de esa materia en el periodo seleccionado.`);
      return;
    }

    // Sesiones traslapadas dentro del mismo grupo
    for (let i = 0; i < horario.length; i++) {
      for (let j = i + 1; j < horario.length; j++) {
        if (traslapan(horario[i], horario[j])) {
          this.errorGuardado.set(`Las sesiones del ${horario[i].dia} se traslapan entre sí.`);
          return;
        }
      }
    }

    // Traslape del profesor con otros de sus grupos del mismo periodo (HU-26)
    for (const otro of this.grupos()) {
      if (otro.id === id || otro.profesorId !== v.profesorId || otro.periodoId !== v.periodoId) continue;
      for (const propia of horario) {
        const choque = otro.horario.find((s) => traslapan(propia, s));
        if (choque) {
          this.errorGuardado.set(
            `${this.nombreProfesor(v.profesorId)} ya tiene ${this.materia(otro.materiaId)?.nombre ?? 'otro grupo'} ` +
              `(Grupo ${otro.grupo}) el ${choque.dia} de ${choque.inicio} a ${choque.fin}.`,
          );
          return;
        }
      }
    }

    const datos = {
      materiaId: v.materiaId,
      periodoId: v.periodoId,
      profesorId: v.profesorId,
      grupo: nombreGrupo,
      modalidad: v.modalidad,
      aula: v.aula.trim() || null,
      enlace: v.enlace.trim() || null,
      horario,
    };

    if (id === null) {
      const nuevoId = this.grupos().reduce((m, g) => Math.max(m, g.id), 0) + 1;
      this.grupos.update((l) => [...l, { id: nuevoId, inscritos: 0, estado: 'abierto', ...datos }]);
      this.aviso.set({ tipo: 'ok', texto: 'Grupo creado. Ya aparece en la lista del profesor asignado.' });
    } else {
      this.grupos.update((l) => l.map((g) => (g.id === id ? { ...g, ...datos } : g)));
      this.aviso.set({ tipo: 'ok', texto: 'Cambios del grupo guardados.' });
    }
    this.formAbierto.set(false);
  }

  limpiar(): void {
    this.filtros.reset();
  }

  // ---------- Ayudas para la vista ----------
  rutaDetalle(id: number): (string | number)[] {
    return ['/admin/grupos', id]; // ajusta a la ruta de tu app
  }

  materia(id: number): Materia | undefined {
    return this.materias.find((m) => m.id === id);
  }

  nombreProfesor(id: number): string {
    return this.profesores.find((p) => p.id === id)?.nombre ?? '—';
  }

  nombrePeriodo(id: number): string {
    return this.periodos.find((p) => p.id === id)?.nombre ?? '—';
  }

  formatoHorario(s: Sesion): string {
    return `${s.dia.slice(0, 3)} ${s.inicio}–${s.fin}`;
  }
}

// ---------- Utilidades ----------
function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function traslapan(a: Sesion, b: Sesion): boolean {
  return a.dia === b.dia && minutos(a.inicio) < minutos(b.fin) && minutos(b.inicio) < minutos(a.fin);
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ---------- Datos de ejemplo (borrar al conectar el servicio) ----------
const PERIODOS_EJEMPLO: Periodo[] = [
  { id: 1, nombre: 'Otoño 2026' },
  { id: 2, nombre: 'Primavera 2026' },
];

const MATERIAS_EJEMPLO: Materia[] = [
  { id: 1, clave: 'ICC-201', nombre: 'Bases de datos', creditos: 8 },
  { id: 2, clave: 'ICC-101', nombre: 'Programación I', creditos: 8 },
  { id: 3, clave: 'MAT-110', nombre: 'Cálculo I', creditos: 10 },
  { id: 4, clave: 'ICC-305', nombre: 'Redes de computadoras', creditos: 6 },
];

const PROFESORES_EJEMPLO: Profesor[] = [
  { id: 1, nombre: 'Jorge Salazar' },
  { id: 2, nombre: 'Rosa Delgado' },
  { id: 3, nombre: 'Héctor Ibarra' },
];

const GRUPOS_EJEMPLO: GrupoLista[] = [
  { id: 1, materiaId: 1, periodoId: 1, profesorId: 1, grupo: '2', modalidad: 'presencial', aula: 'Edificio 1CC2 · Aula 105', enlace: null, horario: [{ dia: 'Lunes', inicio: '09:00', fin: '11:00' }, { dia: 'Miércoles', inicio: '09:00', fin: '11:00' }], inscritos: 28, estado: 'abierto' },
  { id: 2, materiaId: 2, periodoId: 1, profesorId: 1, grupo: '1', modalidad: 'virtual', aula: null, enlace: 'https://meet.example.com/prog1-g1', horario: [{ dia: 'Martes', inicio: '11:00', fin: '13:00' }, { dia: 'Jueves', inicio: '11:00', fin: '13:00' }], inscritos: 31, estado: 'abierto' },
  { id: 3, materiaId: 3, periodoId: 1, profesorId: 2, grupo: '1', modalidad: 'presencial', aula: 'Edificio 1FM · Aula 210', enlace: null, horario: [{ dia: 'Lunes', inicio: '07:00', fin: '09:00' }, { dia: 'Viernes', inicio: '07:00', fin: '09:00' }], inscritos: 35, estado: 'abierto' },
  { id: 4, materiaId: 4, periodoId: 1, profesorId: 3, grupo: '1', modalidad: 'virtual', aula: null, enlace: 'https://meet.example.com/redes-g1', horario: [{ dia: 'Miércoles', inicio: '15:00', fin: '18:00' }], inscritos: 22, estado: 'abierto' },
  { id: 5, materiaId: 1, periodoId: 1, profesorId: 3, grupo: '1', modalidad: 'presencial', aula: 'Edificio 1CC2 · Aula 108', enlace: null, horario: [{ dia: 'Martes', inicio: '07:00', fin: '09:00' }, { dia: 'Jueves', inicio: '07:00', fin: '09:00' }], inscritos: 26, estado: 'abierto' },
  { id: 6, materiaId: 2, periodoId: 2, profesorId: 2, grupo: '3', modalidad: 'presencial', aula: 'Edificio 1CC1 · Aula 101', enlace: null, horario: [{ dia: 'Viernes', inicio: '09:00', fin: '13:00' }], inscritos: 30, estado: 'cerrado' },
  { id: 7, materiaId: 3, periodoId: 2, profesorId: 1, grupo: '2', modalidad: 'virtual', aula: null, enlace: 'https://meet.example.com/calc-g2', horario: [{ dia: 'Martes', inicio: '16:00', fin: '18:00' }, { dia: 'Jueves', inicio: '16:00', fin: '18:00' }], inscritos: 33, estado: 'cerrado' },
];

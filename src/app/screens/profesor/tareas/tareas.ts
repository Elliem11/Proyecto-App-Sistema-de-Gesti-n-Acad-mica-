import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { map, timer } from 'rxjs';

// ============ Tipos y datos dummy (reemplaza por tu servicio / API) ============
interface Alumno { id: number; matricula: string; nombre: string; }
interface Tarea { id: number; titulo: string; evaluacion: string; peso: number; vence: string; tardias: boolean; }
interface Entrega {
  alumnoId: number;
  entregadoEn: string | null; // ISO; null = sin entregar
  tipo: 'archivo' | 'enlace' | null;
  nombre?: string;
  tamano?: number;
  url?: string;
  nota: number | null;
  comentario: string;
}
type Filtro = 'todas' | 'por-calificar' | 'calificadas' | 'sin-entregar';
type EstadoEntrega = 'a-tiempo' | 'tardia' | 'sin-entrega';
type FilaForm = FormGroup<{ alumnoId: FormControl<number>; nota: FormControl<number | null>; comentario: FormControl<string> }>;
interface Fila { grupo: FilaForm; alumno: Alumno; entrega: Entrega; estado: EstadoEntrega; }

const CURSO = { nombre: 'Programación Web', grupo: '102' };
const NOTA_MIN = 0;
const NOTA_MAX = 10;

const ALUMNOS: Alumno[] = [
  { id: 1, matricula: '20232001', nombre: 'Astorga Elizabeth' },
  { id: 2, matricula: '20232002', nombre: 'Corona Evelin' },
  { id: 3, matricula: '20232003', nombre: 'García Luis' },
  { id: 4, matricula: '20232004', nombre: 'Martínez Sofía' },
  { id: 5, matricula: '20232005', nombre: 'Hernández Diego' },
  { id: 6, matricula: '20232006', nombre: 'López Valeria' },
  { id: 7, matricula: '20232007', nombre: 'Ramírez Mateo' },
  { id: 8, matricula: '20232008', nombre: 'Torres Camila' },
  { id: 9, matricula: '20232009', nombre: 'Flores Jorge' },
  { id: 10, matricula: '20232010', nombre: 'Vargas Fernanda' },
];

const TAREAS: Tarea[] = [
  { id: 1, titulo: 'Maquetación con Flexbox', evaluacion: 'Tareas', peso: 25, vence: '2026-11-06T23:59:00', tardias: false },
  { id: 2, titulo: 'Formulario con validaciones', evaluacion: 'Tareas', peso: 25, vence: '2026-11-09T23:59:00', tardias: true },
  { id: 3, titulo: 'Avance 1 del proyecto final', evaluacion: 'Proyecto final', peso: 45, vence: '2026-11-20T18:00:00', tardias: false },
];

const entrega = (alumnoId: number, iso: string, tipo: 'archivo' | 'enlace', detalle: string, nota: number | null = null, comentario = ''): Entrega => ({
  alumnoId, entregadoEn: iso, tipo, nota, comentario,
  nombre: tipo === 'archivo' ? detalle : undefined,
  tamano: tipo === 'archivo' ? 180000 + alumnoId * 137000 : undefined,
  url: tipo === 'enlace' ? detalle : undefined,
});
const sinEntrega = (alumnoId: number): Entrega => ({ alumnoId, entregadoEn: null, tipo: null, nota: null, comentario: '' });

/** Completa con "sin entregar" a quien no tiene entrega (HU-19 CA3). */
const completar = (porAlumno: Record<number, Entrega>): Entrega[] => ALUMNOS.map((a) => porAlumno[a.id] ?? sinEntrega(a.id));

const ENTREGAS_INICIALES: Record<number, Entrega[]> = {
  1: completar({
    1: entrega(1, '2026-11-05T20:10:00', 'archivo', 'flexbox_astorga.zip', 9, 'Muy buena maquetación.'),
    2: entrega(2, '2026-11-06T09:30:00', 'archivo', 'flexbox_corona.zip', 8.5, 'Falta cuidar la vista móvil.'),
    3: entrega(3, '2026-11-06T22:50:00', 'enlace', 'https://github.com/luis-garcia/flexbox', 7),
    4: entrega(4, '2026-11-04T18:00:00', 'archivo', 'flexbox_martinez.zip', 10, 'Excelente trabajo.'),
    5: entrega(5, '2026-11-06T23:20:00', 'archivo', 'flexbox_hernandez.zip'),
    6: entrega(6, '2026-11-05T12:05:00', 'enlace', 'https://github.com/valeria-lopez/flexbox'),
    7: entrega(7, '2026-11-06T15:40:00', 'archivo', 'flexbox_ramirez.zip'),
    8: entrega(8, '2026-11-06T21:15:00', 'archivo', 'flexbox_torres.zip'),
  }),
  2: completar({
    1: entrega(1, '2026-11-08T19:00:00', 'archivo', 'formulario_astorga.zip', 10, 'Validaciones completas.'),
    2: entrega(2, '2026-11-09T10:20:00', 'enlace', 'https://github.com/evelin-corona/formulario'),
    4: entrega(4, '2026-11-09T22:10:00', 'archivo', 'formulario_martinez.zip'),
    6: entrega(6, '2026-11-10T08:15:00', 'archivo', 'formulario_lopez.zip'),
    7: entrega(7, '2026-11-10T09:40:00', 'enlace', 'https://github.com/mateo-ramirez/formulario'),
    9: entrega(9, '2026-11-09T21:00:00', 'archivo', 'formulario_flores.zip'),
  }),
  3: completar({}),
};

// ============ Utilidades y validadores ============
const formatoTamano = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Máximo de decimales permitidos en la nota. */
const decimalesMax = (max: number) => (c: AbstractControl): ValidationErrors | null => {
  const v = c.value;
  if (typeof v !== 'number') return null;
  const f = 10 ** max;
  return Math.abs(v * f - Math.round(v * f)) > 1e-8 ? { decimales: { max } } : null;
};

/** No se puede guardar retroalimentación sin calificación. */
const comentarioConNota = (g: AbstractControl): ValidationErrors | null => {
  const nota = g.get('nota')?.value;
  const comentario = String(g.get('comentario')?.value ?? '').trim();
  return comentario && (nota === null || nota === undefined) ? { notaFaltante: true } : null;
};

/** HU-19 / RF-23: revisar entregas, calificarlas y dejar retroalimentación. */
@Component({
  selector: 'app-tareas-entregas',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './tareas.html',
  styleUrl: './tareas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TareasEntregas {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Solo para probar: pon true y verás el mensaje de error de red al guardar. */
  simularFalla = false;

  readonly curso = CURSO;
  readonly tareas = TAREAS;
  readonly notaMin = NOTA_MIN;
  readonly notaMax = NOTA_MAX;
  readonly formatoTamano = formatoTamano;
  readonly columns = ['Alumno', 'Entrega', 'Fecha de entrega', 'Archivo / enlace', 'Calificación (0 a 10)', 'Retroalimentación'];
  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'todas', texto: 'Todas' },
    { valor: 'por-calificar', texto: 'Por calificar' },
    { valor: 'calificadas', texto: 'Calificadas' },
    { valor: 'sin-entregar', texto: 'Sin entregar' },
  ];

  readonly tareaCtrl = new FormControl(TAREAS[0].id, { nonNullable: true });
  readonly filtroCtrl = new FormControl<Filtro>('todas', { nonNullable: true });
  private readonly filtro = toSignal(this.filtroCtrl.valueChanges, { initialValue: 'todas' as Filtro });

  readonly tareaId = signal(TAREAS[0].id);
  readonly entregas = signal<Record<number, Entrega[]>>(ENTREGAS_INICIALES);
  readonly filas = signal<Fila[]>([]);
  readonly guardando = signal(false);
  readonly aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  readonly form = this.fb.array<FilaForm>([]);
  private readonly cambios = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly tarea = computed(() => TAREAS.find((t) => t.id === this.tareaId())!);
  readonly cerrada = computed(() => !this.tarea().tardias && Date.now() > new Date(this.tarea().vence).getTime());
  readonly sinGuardar = computed(() => {
    this.cambios();
    return this.form.controls.filter((c) => c.dirty).length;
  });

  /** Resumen con lo ya guardado. */
  readonly resumen = computed(() => {
    const t = this.tarea();
    const lista = this.entregas()[t.id] ?? [];
    const entregadas = lista.filter((e) => e.entregadoEn);
    return {
      total: lista.length,
      entregadas: entregadas.length,
      tardias: entregadas.filter((e) => e.entregadoEn! > t.vence).length,
      sin: lista.length - entregadas.length,
      calificadas: lista.filter((e) => e.nota !== null).length,
    };
  });

  readonly visibles = computed(() => {
    const f = this.filtro();
    return this.filas().filter(({ entrega: e }) =>
      f === 'por-calificar' ? !!e.entregadoEn && e.nota === null
      : f === 'calificadas' ? e.nota !== null
      : f === 'sin-entregar' ? !e.entregadoEn
      : true,
    );
  });

  constructor() {
    this.construir();
  }

  // ---------- Acciones ----------
  cambiarTarea(): void {
    if (this.sinGuardar() > 0 && !globalThis.confirm('Tienes calificaciones sin guardar. ¿Descartarlas y cambiar de tarea?')) {
      this.tareaCtrl.setValue(this.tareaId(), { emitEvent: false });
      return;
    }
    this.tareaId.set(this.tareaCtrl.value);
    this.aviso.set(null);
    this.filtroCtrl.setValue('todas');
    this.construir();
  }

  descartar(): void {
    this.construir();
    this.aviso.set(null);
  }

  /** Dummy: aquí llamas a tu endpoint de descarga. */
  descargar(nombre: string): void {
    this.aviso.set({ tipo: 'info', texto: `Descarga simulada de «${nombre}». Aquí va tu endpoint.` });
  }

  guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    const sucias = this.form.controls.filter((c) => c.dirty && c.enabled);

    if (sucias.length === 0) {
      this.aviso.set({ tipo: 'info', texto: 'No hay cambios por guardar.' });
      return;
    }
    if (sucias.some((c) => c.invalid)) {
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' });
      return;
    }

    const cambios = sucias.map((c) => {
      const v = c.getRawValue();
      return { alumnoId: v.alumnoId, nota: v.nota, comentario: v.comentario.trim() };
    });

    this.guardando.set(true);
    this.aviso.set(null);
    // Simula la petición al servidor: aquí va tu HttpClient.
    timer(700).pipe(map(() => { if (this.simularFalla) throw new Error('red'); })).subscribe({
      next: () => {
        const id = this.tareaId();
        this.entregas.update((todo) => ({
          ...todo,
          [id]: todo[id].map((e) => cambios.find((c) => c.alumnoId === e.alumnoId) ? { ...e, ...cambios.find((c) => c.alumnoId === e.alumnoId)! } : e),
        }));
        this.guardando.set(false);
        this.construir();
        this.aviso.set({ tipo: 'ok', texto: `${cambios.length} ${cambios.length === 1 ? 'calificación guardada' : 'calificaciones guardadas'} correctamente.` });
      },
      error: () => {
        this.guardando.set(false);
        this.aviso.set({ tipo: 'error', texto: 'No se pudo guardar. Tus datos siguen en pantalla; intenta de nuevo.' });
      },
    });
  }

  // ---------- Internos ----------
  private construir(): void {
    const t = this.tarea();
    this.form.clear({ emitEvent: false });
    const filas = (this.entregas()[t.id] ?? []).map((e): Fila => {
      const grupo = this.crearFila(e);
      this.form.push(grupo, { emitEvent: false });
      return {
        grupo,
        alumno: ALUMNOS.find((a) => a.id === e.alumnoId)!,
        entrega: e,
        estado: !e.entregadoEn ? 'sin-entrega' : e.entregadoEn <= t.vence ? 'a-tiempo' : 'tardia',
      };
    });
    this.filas.set(filas);
    this.form.markAsPristine();
    this.form.updateValueAndValidity();
  }

  private crearFila(e: Entrega): FilaForm {
    const grupo = this.fb.group(
      {
        alumnoId: [e.alumnoId],
        nota: this.fb.control<number | null>(e.nota, [Validators.min(NOTA_MIN), Validators.max(NOTA_MAX), decimalesMax(2)]),
        comentario: [e.comentario, Validators.maxLength(500)],
      },
      { validators: comentarioConNota },
    );
    if (!e.entregadoEn) grupo.disable({ emitEvent: false }); // sin entrega no se califica
    return grupo;
  }
}

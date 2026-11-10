import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
type Estado = 'presente' | 'falta' | 'justificada';
type Modalidad = 'presencial' | 'virtual';

interface Alumno { id: number; matricula: string; nombre: string; }
interface Registro { alumnoId: number; estado: Estado; motivo: string; }
interface Sesion {
  fecha: string; // yyyy-MM-dd
  hora: string; // HH:mm
  modalidad: Modalidad;
  registros: Registro[];
  modificadoPor?: string; // HU-21: quién y cuándo corrigió
  modificadoEn?: string;
}
type FilaForm = FormGroup<{ alumnoId: FormControl<number>; estado: FormControl<Estado>; motivo: FormControl<string> }>;

const MINIMO = 80; // % mínimo de asistencia
const PROFESOR = 'Evelin Estrella';
const CURSO = { nombre: 'Programación Web', clave: 'TIC-310', grupo: '102', periodo: 'Otoño 2026', modalidad: 'virtual' as Modalidad };

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

const sesion = (fecha: string, hora: string, faltas: number[], justificadas: number[]): Sesion => ({
  fecha,
  hora,
  modalidad: 'virtual',
  registros: ALUMNOS.map((a) => ({
    alumnoId: a.id,
    estado: faltas.includes(a.id) ? 'falta' : justificadas.includes(a.id) ? 'justificada' : 'presente',
    motivo: justificadas.includes(a.id) ? 'Cita médica (justificante entregado)' : '',
  })),
});

const SESIONES_PREVIAS: Sesion[] = [
  sesion('2026-11-03', '10:03', [3, 7], [5]),
  sesion('2026-11-05', '10:01', [3], []),
  sesion('2026-11-09', '10:05', [3, 9], [7]),
];

// ============ Utilidades y validadores ============
const dos = (n: number) => String(n).padStart(2, '0');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
const horaActual = () => { const d = new Date(); return `${dos(d.getHours())}:${dos(d.getMinutes())}`; };

/** La fecha de la sesión no puede ser posterior a hoy. */
const fechaNoFutura = (c: AbstractControl): ValidationErrors | null =>
  c.value && c.value > hoyISO() ? { fechaFutura: true } : null;

/** Falta justificada => motivo obligatorio (mínimo 5 caracteres). */
const motivoJustificacion = (g: AbstractControl): ValidationErrors | null => {
  if (g.get('estado')?.value !== 'justificada') return null;
  const m = String(g.get('motivo')?.value ?? '').trim();
  return !m ? { motivoRequerido: true } : m.length < 5 ? { motivoCorto: true } : null;
};

/** HU-01 Registrar asistencias · HU-21 Corregir y justificar · RF-15 % y riesgo. */
@Component({
  selector: 'app-pase-lista',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './asistencia-a.html',
  styleUrl: './asistencia-a.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaseLista {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Solo para probar: pon true y verás el mensaje de error de red al guardar. */
  simularFalla = false;

  readonly curso = CURSO;
  readonly alumnos = ALUMNOS;
  readonly minimo = MINIMO;
  readonly hoy = hoyISO();
  readonly columns = ['Matrícula', 'Nombre del alumno', 'Estado', 'Notas / Justificación', '% asistencia'];

  readonly sesiones = signal<Sesion[]>(SESIONES_PREVIAS);
  readonly modo = signal<'nueva' | 'edicion'>('nueva');
  readonly aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  readonly guardando = signal(false);
  readonly ultimaEdicion = signal<{ por: string; en: string } | null>(null);

  readonly form = this.fb.group({
    fecha: [hoyISO(), [Validators.required, fechaNoFutura]],
    hora: [horaActual(), [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    modalidad: [CURSO.modalidad, Validators.required],
    registros: this.fb.array<FilaForm>([]),
  });

  private readonly cambios = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly resumen = computed(() => {
    this.cambios();
    const r = this.registros.getRawValue();
    const n = (e: Estado) => r.filter((x) => x.estado === e).length;
    return { total: r.length, presentes: n('presente'), faltas: n('falta'), justificadas: n('justificada') };
  });

  /** % por alumno con las sesiones guardadas (la justificada cuenta como asistencia). */
  readonly porcentajes = computed(() => {
    const ses = this.sesiones();
    return new Map(
      ALUMNOS.map((a) => {
        const regs = ses.map((s) => s.registros.find((r) => r.alumnoId === a.id)).filter((r) => !!r);
        const pct = regs.length ? Math.round((regs.filter((r) => r.estado !== 'falta').length / regs.length) * 100) : null;
        return [a.id, pct] as const;
      }),
    );
  });

  constructor() {
    this.cargarFecha();
    this.form.controls.fecha.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.cargarFecha());
    // El aviso de validación se quita en cuanto el formulario vuelve a ser válido.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.aviso()?.tipo === 'error' && this.form.valid) this.aviso.set(null);
    });
  }

  get registros() { return this.form.controls.registros; }
  alumno(id: number) { return ALUMNOS.find((a) => a.id === id); }

  // ---------- Acciones ----------
  /** "Nueva sesión": fecha y hora actuales; si ya hay registro ese día, se abre para editarlo (CA2). */
  nuevaSesion(): void {
    this.form.patchValue({ fecha: hoyISO(), hora: horaActual(), modalidad: CURSO.modalidad }, { emitEvent: false });
    this.cargarFecha();
  }

  /** "Cancelar": descarta los cambios y vuelve a lo último guardado. */
  cancelar(): void { this.cargarFecha(); }

  setEstado(i: number, estado: Estado): void {
    const fila = this.registros.at(i);
    fila.controls.estado.setValue(estado);
    fila.controls.estado.markAsDirty();
    if (estado !== 'justificada') fila.controls.motivo.setValue('');
  }

  guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.alumnos.length === 0) {
      this.aviso.set({ tipo: 'info', texto: 'Este grupo aún no tiene alumnos inscritos.' });
      return;
    }
    if (this.form.invalid) {
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' });
      return;
    }

    const v = this.form.getRawValue();
    const nueva: Sesion = {
      fecha: v.fecha, hora: v.hora, modalidad: v.modalidad,
      registros: v.registros.map((r) => ({
        alumnoId: r.alumnoId, estado: r.estado, motivo: r.estado === 'justificada' ? r.motivo.trim() : '',
      })),
    };

    this.guardando.set(true);
    this.aviso.set(null);
    // Simula la petición al servidor: aquí va tu HttpClient.
    timer(600).pipe(map(() => { if (this.simularFalla) throw new Error('red'); })).subscribe({
      next: () => {
        const existe = this.sesiones().some((s) => s.fecha === nueva.fecha);
        if (existe) { nueva.modificadoPor = PROFESOR; nueva.modificadoEn = new Date().toISOString(); }
        this.sesiones.update((l) => (existe ? l.map((s) => (s.fecha === nueva.fecha ? nueva : s)) : [...l, nueva]));
        this.guardando.set(false);
        this.modo.set('edicion');
        this.form.markAsPristine();
        this.ultimaEdicion.set(nueva.modificadoPor ? { por: nueva.modificadoPor, en: nueva.modificadoEn! } : null);
        this.aviso.set({ tipo: 'ok', texto: 'Asistencia guardada correctamente.' });
      },
      error: () => {
        this.guardando.set(false);
        this.aviso.set({ tipo: 'error', texto: 'No se pudo guardar. Tus datos siguen en pantalla; intenta de nuevo.' });
      },
    });
  }

  // ---------- Internos ----------
  /** Carga la sesión de la fecha elegida (si existe se edita; si no, todos aparecen "Presente"). */
  private cargarFecha(): void {
    this.aviso.set(null);
    this.ultimaEdicion.set(null);
    this.registros.clear({ emitEvent: false });
    this.modo.set('nueva');

    const { fecha } = this.form.getRawValue();
    const existente = this.form.controls.fecha.valid ? this.sesiones().find((s) => s.fecha === fecha) : undefined;

    if (existente) {
      this.form.patchValue({ hora: existente.hora, modalidad: existente.modalidad }, { emitEvent: false });
      existente.registros.forEach((r) => this.registros.push(this.crearFila(r.alumnoId, r.estado, r.motivo), { emitEvent: false }));
      this.modo.set('edicion');
      if (existente.modificadoPor && existente.modificadoEn)
        this.ultimaEdicion.set({ por: existente.modificadoPor, en: existente.modificadoEn });
      this.aviso.set({ tipo: 'info', texto: 'Ya existe un registro para esta fecha. Se abrió para editarlo.' });
    } else {
      ALUMNOS.forEach((a) => this.registros.push(this.crearFila(a.id, 'presente', ''), { emitEvent: false }));
    }
    this.form.markAsPristine();
    this.form.updateValueAndValidity();
  }

  private crearFila(alumnoId: number, estado: Estado, motivo: string): FilaForm {
    return this.fb.group(
      { alumnoId: [alumnoId], estado: [estado], motivo: [motivo, Validators.maxLength(200)] },
      { validators: motivoJustificacion },
    );
  }
}

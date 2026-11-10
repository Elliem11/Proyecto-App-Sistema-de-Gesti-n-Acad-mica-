import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { debounceTime, map, timer } from 'rxjs';
import { normalizar } from '../../../utils/texto';

// ============ Tipos y datos dummy (reemplaza por tu servicio / API) ============
interface Materia {
  id: number;
  clave: string;
  nombre: string;
  creditos: number;
  carrera: string;
  activa: boolean;
}

interface Periodo {
  id: number;
  nombre: string; // formato AAAA-N, ej. 2026-1
  fechaInicio: string; // yyyy-MM-dd
  fechaFin: string;
  activo: boolean;
  inscripcionesAbiertas: boolean;
}

const MATERIAS: Materia[] = [
  { id: 1, clave: 'TIC-310', nombre: 'Programación Web', creditos: 8, carrera: 'Ing. en Sistemas', activa: true },
  { id: 2, clave: 'TIC-320', nombre: 'Bases de Datos', creditos: 8, carrera: 'Ing. en Sistemas', activa: true },
  { id: 3, clave: 'MAT-110', nombre: 'Álgebra Lineal', creditos: 6, carrera: 'Matemáticas Aplicadas', activa: true },
  { id: 4, clave: 'TIC-405', nombre: 'Redes de Computadoras', creditos: 6, carrera: 'Ing. en Sistemas', activa: false },
];

const PERIODOS: Periodo[] = [
  { id: 1, nombre: '2025-3', fechaInicio: '2025-05-26', fechaFin: '2025-08-22', activo: false, inscripcionesAbiertas: false },
  { id: 2, nombre: '2026-1', fechaInicio: '2026-08-24', fechaFin: '2026-12-18', activo: false, inscripcionesAbiertas: false },
  { id: 3, nombre: '2026-2', fechaInicio: '2027-01-18', fechaFin: '2027-05-28', activo: false, inscripcionesAbiertas: false },
];

// ============ Validadores ============
/** La fecha de fin debe ser posterior a la de inicio. */
const finDespuesDeInicio = (g: AbstractControl): ValidationErrors | null => {
  const ini = g.get('fechaInicio')?.value;
  const fin = g.get('fechaFin')?.value;
  return ini && fin && fin <= ini ? { rangoInvalido: true } : null;
};

/** RF-06: el administrador gestiona las materias y los periodos académicos. */
@Component({
  selector: 'app-materias-periodos',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './materias-periodos.html',
  styleUrl: './materias-periodos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MateriasPeriodos {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Solo para probar: pon true y verás el mensaje de error de red al guardar. */
  simularFalla = false;

  readonly columnsMaterias = ['Clave', 'Materia', 'Créditos', 'Carrera', 'Estado', 'Acciones'];
  readonly columnsPeriodos = ['Periodo', 'Inicio', 'Fin', 'Estado', 'Inscripciones', 'Acciones'];

  readonly materias = signal<Materia[]>(MATERIAS);
  readonly periodos = signal<Periodo[]>(PERIODOS);

  readonly tab = signal<'materias' | 'periodos'>('materias');
  readonly materiaEditando = signal<Materia | null>(null);
  readonly periodoEditando = signal<Periodo | null>(null);
  readonly aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  readonly guardando = signal(false);

  /** Máximo 60 caracteres y sin < ni > (evita pegar HTML). */
  readonly busqueda = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(60), Validators.pattern(/^[^<>]*$/)],
  });

  private readonly texto = toSignal(
    this.busqueda.valueChanges.pipe(
      debounceTime(200),
      map((v) => (this.busqueda.valid ? normalizar(v) : '')),
    ),
    { initialValue: '' },
  );

  readonly materiasFiltradas = computed(() => {
    const q = this.texto();
    return this.materias().filter((m) => !q || normalizar(`${m.nombre} ${m.clave} ${m.carrera}`).includes(q));
  });

  readonly mensajeVacio = computed(() =>
    this.materias().length === 0
      ? 'Aún no hay materias registradas.'
      : `No se encontraron materias para «${this.busqueda.value.trim()}».`,
  );

  readonly materiaForm = this.fb.group({
    clave: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[^<>]*$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/^[^<>]*$/)]],
    creditos: [6, [Validators.required, Validators.min(1), Validators.max(30)]],
    carrera: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[^<>]*$/)]],
  });

  readonly periodoForm = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.pattern(/^\d{4}-[1-3]$/)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
    },
    { validators: finDespuesDeInicio },
  );

  constructor() {
    // El aviso de validación se quita en cuanto el formulario vuelve a ser válido.
    this.materiaForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.aviso()?.tipo === 'error' && this.materiaForm.valid) this.aviso.set(null);
    });
    this.periodoForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.aviso()?.tipo === 'error' && this.periodoForm.valid) this.aviso.set(null);
    });
  }

  // ---------- Materias ----------

  guardarMateria(): void {
    if (this.guardando()) return;
    this.materiaForm.markAllAsTouched();
    if (this.materiaForm.invalid) {
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' });
      return;
    }

    const v = this.materiaForm.getRawValue();
    const editando = this.materiaEditando();
    const duplicada = this.materias().some((m) => m.id !== editando?.id && normalizar(m.clave) === normalizar(v.clave));
    if (duplicada) {
      this.aviso.set({ tipo: 'error', texto: `La clave ${v.clave} ya está registrada.` });
      return;
    }

    this.guardando.set(true);
    this.aviso.set(null);
    // Simula la petición al servidor: aquí va tu HttpClient.
    timer(500)
      .pipe(map(() => { if (this.simularFalla) throw new Error('red'); }))
      .subscribe({
        next: () => {
          if (editando) {
            this.materias.update((l) => l.map((m) => (m.id === editando.id ? { ...m, ...v } : m)));
          } else {
            const id = Math.max(0, ...this.materias().map((m) => m.id)) + 1;
            this.materias.update((l) => [...l, { id, ...v, activa: true }]);
          }
          this.guardando.set(false);
          this.aviso.set({ tipo: 'ok', texto: editando ? 'Materia actualizada correctamente.' : 'Materia agregada correctamente.' });
          this.resetMateria();
        },
        error: () => {
          this.guardando.set(false);
          this.aviso.set({ tipo: 'error', texto: 'No se pudo guardar. Tus datos siguen en pantalla; intenta de nuevo.' });
        },
      });
  }

  editarMateria(m: Materia): void {
    this.materiaEditando.set(m);
    this.materiaForm.patchValue(m);
    this.aviso.set(null);
  }

  /** No se borra: se desactiva para no romper el historial / Kárdex. */
  toggleMateria(m: Materia): void {
    this.materias.update((l) => l.map((x) => (x.id === m.id ? { ...x, activa: !x.activa } : x)));
    this.aviso.set({ tipo: 'ok', texto: m.activa ? `Materia ${m.clave} desactivada.` : `Materia ${m.clave} activada.` });
  }

  cancelarMateria(): void {
    this.resetMateria();
  }

  private resetMateria(): void {
    this.materiaForm.reset({ clave: '', nombre: '', creditos: 6, carrera: '' });
    this.materiaEditando.set(null);
  }

  // ---------- Periodos ----------

  guardarPeriodo(): void {
    if (this.guardando()) return;
    this.periodoForm.markAllAsTouched();
    if (this.periodoForm.invalid) {
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de guardar.' });
      return;
    }

    const v = this.periodoForm.getRawValue();
    const editando = this.periodoEditando();
    const duplicado = this.periodos().some((p) => p.id !== editando?.id && normalizar(p.nombre) === normalizar(v.nombre));
    if (duplicado) {
      this.aviso.set({ tipo: 'error', texto: `El periodo ${v.nombre} ya está registrado.` });
      return;
    }

    this.guardando.set(true);
    this.aviso.set(null);
    timer(500)
      .pipe(map(() => { if (this.simularFalla) throw new Error('red'); }))
      .subscribe({
        next: () => {
          if (editando) {
            this.periodos.update((l) => l.map((p) => (p.id === editando.id ? { ...p, ...v } : p)));
          } else {
            const id = Math.max(0, ...this.periodos().map((p) => p.id)) + 1;
            this.periodos.update((l) => [...l, { id, ...v, activo: false, inscripcionesAbiertas: false }]);
          }
          this.guardando.set(false);
          this.aviso.set({ tipo: 'ok', texto: editando ? 'Periodo actualizado correctamente.' : 'Periodo agregado correctamente.' });
          this.resetPeriodo();
        },
        error: () => {
          this.guardando.set(false);
          this.aviso.set({ tipo: 'error', texto: 'No se pudo guardar. Tus datos siguen en pantalla; intenta de nuevo.' });
        },
      });
  }

  editarPeriodo(p: Periodo): void {
    this.periodoEditando.set(p);
    this.periodoForm.patchValue(p);
    this.aviso.set(null);
  }

  /** Solo puede haber un periodo activo: al activar uno se desactivan los demás. */
  activarPeriodo(p: Periodo): void {
    this.periodos.update((l) =>
      l.map((x) => ({ ...x, activo: x.id === p.id, inscripcionesAbiertas: x.id === p.id ? x.inscripcionesAbiertas : false })),
    );
    this.aviso.set({ tipo: 'ok', texto: `Periodo ${p.nombre} activado. Los demás quedaron inactivos.` });
  }

  /** RF-08: bloquear / abrir nuevas inscripciones del periodo activo. */
  toggleInscripciones(p: Periodo): void {
    if (!p.activo) {
      this.aviso.set({ tipo: 'info', texto: 'Solo el periodo activo puede abrir o bloquear inscripciones.' });
      return;
    }
    this.periodos.update((l) => l.map((x) => (x.id === p.id ? { ...x, inscripcionesAbiertas: !x.inscripcionesAbiertas } : x)));
    this.aviso.set({
      tipo: 'ok',
      texto: p.inscripcionesAbiertas ? `Inscripciones bloqueadas para ${p.nombre}.` : `Inscripciones abiertas para ${p.nombre}.`,
    });
  }

  cancelarPeriodo(): void {
    this.resetPeriodo();
  }

  private resetPeriodo(): void {
    this.periodoForm.reset({ nombre: '', fechaInicio: '', fechaFin: '' });
    this.periodoEditando.set(null);
  }

  // ---------- Utilidades ----------

  cambiarTab(t: 'materias' | 'periodos'): void {
    this.tab.set(t);
    this.aviso.set(null);
  }
}

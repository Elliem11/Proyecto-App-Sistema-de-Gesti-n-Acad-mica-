import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { map, timer } from 'rxjs';

// ============ Datos dummy (reemplaza por tu servicio / API) ============
interface EvaluacionOpcion { id: string; nombre: string; peso: number; }
interface Tarea {
  id: number;
  titulo: string;
  evaluacion: string;
  vence: string; // ISO
  tardias: boolean;
  adjuntos: number;
  estado: 'Vigente' | 'Cerrada';
}

const CURSO = { nombre: 'Programación Web', grupo: '102', clave: 'TIC-310' };

/** Evaluaciones del curso a las que se puede asociar la tarea (HU-19 CA2: la calificación se asocia a la evaluación). */
const EVALUACIONES: EvaluacionOpcion[] = [
  { id: 'e-2-2', nombre: 'Tareas', peso: 25 },
  { id: 'e-2-3', nombre: 'Proyecto final', peso: 45 },
];

const TAREAS_INICIALES: Tarea[] = [
  { id: 1, titulo: 'Maquetación con Flexbox', evaluacion: 'Tareas', vence: '2026-11-06T23:59:00', tardias: false, adjuntos: 1, estado: 'Cerrada' },
  { id: 2, titulo: 'Formulario con validaciones', evaluacion: 'Tareas', vence: '2026-11-13T23:59:00', tardias: true, adjuntos: 2, estado: 'Vigente' },
  { id: 3, titulo: 'Avance 1 del proyecto final', evaluacion: 'Proyecto final', vence: '2026-11-20T18:00:00', tardias: false, adjuntos: 0, estado: 'Vigente' },
];

// ============ Reglas de la documentación (RF-18, RNF-05) ============
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_ARCHIVOS = 5;
const MAX_ENLACES = 5;
const EXTENSIONES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'png', 'jpg', 'jpeg'];

// ============ Utilidades y validadores ============
const dos = (n: number) => String(n).padStart(2, '0');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
const horaActual = () => { const d = new Date(); return `${dos(d.getHours())}:${dos(d.getMinutes())}`; };

const noSoloEspacios = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.length > 0 && !c.value.trim() ? { required: true } : null;

const fechaNoPasada = (c: AbstractControl): ValidationErrors | null =>
  c.value && c.value < hoyISO() ? { fechaPasada: true } : null;

/** Si la fecha límite es hoy, la hora debe ser posterior a la actual. */
const horaFutura = (g: AbstractControl): ValidationErrors | null => {
  const fecha = g.get('fecha')?.value;
  const hora = g.get('hora')?.value;
  return fecha === hoyISO() && hora && hora <= horaActual() ? { horaPasada: true } : null;
};

/** Solo enlaces http(s) válidos. */
function urlValida(texto: string): boolean {
  try {
    const u = new URL(texto);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const formatoTamano = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** RF-18 Crear tareas: descripción, fecha límite, adjuntos o enlaces opcionales y política de entregas tardías. */
@Component({
  selector: 'app-crear-tarea',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './crear-tarea.html',
  styleUrl: './crear-tarea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearTarea {
  private readonly fb = inject(NonNullableFormBuilder);

  /** Solo para probar: pon true y verás el mensaje de error de red al publicar. */
  simularFalla = false;

  readonly curso = CURSO;
  readonly evaluaciones = EVALUACIONES;
  readonly hoy = hoyISO();
  readonly maxMb = MAX_MB;
  readonly maxArchivos = MAX_ARCHIVOS;
  readonly maxEnlaces = MAX_ENLACES;
  readonly aceptar = EXTENSIONES.map((e) => '.' + e).join(',');
  readonly extensiones = EXTENSIONES.join(', ');
  readonly columns = ['Tarea', 'Evaluación', 'Fecha límite', 'Entregas tardías', 'Adjuntos', 'Estado'];
  readonly formatoTamano = formatoTamano;

  readonly tareas = signal<Tarea[]>(TAREAS_INICIALES);
  readonly archivos = signal<File[]>([]);
  readonly enlaces = signal<string[]>([]);
  readonly erroresArchivos = signal<string[]>([]);
  readonly enlace = new FormControl('', { nonNullable: true });
  readonly errorEnlace = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly form = this.fb.group(
    {
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), noSoloEspacios]],
      descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000), noSoloEspacios]],
      evaluacionId: ['', Validators.required],
      fecha: ['', [Validators.required, fechaNoPasada]],
      hora: ['23:59', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      // Decisión del profesor por tarea: aceptar entregas tardías o cerrar al vencer.
      entregasTardias: ['no' as 'si' | 'no', Validators.required],
    },
    { validators: horaFutura },
  );

  // ---------- Adjuntos (máx. 10 MB c/u, tipos permitidos) ----------
  alSeleccionarArchivos(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const errores: string[] = [];
    const actuales = [...this.archivos()];

    for (const f of Array.from(input.files ?? [])) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (!EXTENSIONES.includes(ext)) errores.push(`«${f.name}»: tipo de archivo no permitido.`);
      else if (f.size > MAX_BYTES) errores.push(`«${f.name}» pesa más de ${MAX_MB} MB. Puedes adjuntar un enlace en su lugar.`);
      else if (f.size === 0) errores.push(`«${f.name}» está vacío.`);
      else if (actuales.some((a) => a.name === f.name && a.size === f.size)) errores.push(`«${f.name}» ya está adjunto.`);
      else if (actuales.length >= MAX_ARCHIVOS) errores.push(`Máximo ${MAX_ARCHIVOS} archivos por tarea.`);
      else actuales.push(f);
    }
    this.archivos.set(actuales);
    this.erroresArchivos.set([...new Set(errores)]);
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  quitarArchivo(i: number): void {
    this.archivos.update((l) => l.filter((_, idx) => idx !== i));
    this.erroresArchivos.set([]);
  }

  // ---------- Enlaces opcionales ----------
  agregarEnlace(): void {
    const texto = this.enlace.value.trim();
    if (!texto) return this.errorEnlace.set('Escribe un enlace.');
    if (!urlValida(texto)) return this.errorEnlace.set('Escribe un enlace válido que empiece con http:// o https://.');
    if (this.enlaces().includes(texto)) return this.errorEnlace.set('Ese enlace ya está agregado.');
    if (this.enlaces().length >= MAX_ENLACES) return this.errorEnlace.set(`Máximo ${MAX_ENLACES} enlaces por tarea.`);
    this.enlaces.update((l) => [...l, texto]);
    this.enlace.reset('');
    this.errorEnlace.set(null);
  }

  quitarEnlace(i: number): void {
    this.enlaces.update((l) => l.filter((_, idx) => idx !== i));
  }

  // ---------- Publicar / cancelar ----------
  publicar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    this.aviso.set(null);

    if (this.enlace.value.trim()) {
      this.errorEnlace.set('Pulsa «Agregar» para añadir el enlace o bórralo.');
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de publicar.' });
      return;
    }
    if (this.form.invalid) {
      this.aviso.set({ tipo: 'error', texto: 'Revisa los campos marcados antes de publicar.' });
      return;
    }

    const v = this.form.getRawValue();
    const evaluacion = EVALUACIONES.find((e) => e.id === v.evaluacionId)!;
    const nueva: Tarea = {
      id: Date.now(),
      titulo: v.titulo.trim(),
      evaluacion: evaluacion.nombre,
      vence: `${v.fecha}T${v.hora}:00`,
      tardias: v.entregasTardias === 'si',
      adjuntos: this.archivos().length + this.enlaces().length,
      estado: 'Vigente',
    };

    this.guardando.set(true);
    // Simula la petición al servidor: aquí va tu HttpClient (los archivos se envían con FormData).
    timer(700).pipe(map(() => { if (this.simularFalla) throw new Error('red'); })).subscribe({
      next: () => {
        this.tareas.update((l) => [nueva, ...l]);
        this.guardando.set(false);
        this.limpiar();
        this.aviso.set({ tipo: 'ok', texto: `Tarea «${nueva.titulo}» publicada. Los alumnos recibirán una notificación.` });
      },
      error: () => {
        this.guardando.set(false);
        this.aviso.set({ tipo: 'error', texto: 'No se pudo publicar. Tus datos siguen en pantalla; intenta de nuevo.' });
      },
    });
  }

  cancelar(): void {
    this.limpiar();
    this.aviso.set(null);
  }

  private limpiar(): void {
    this.form.reset();
    this.archivos.set([]);
    this.enlaces.set([]);
    this.erroresArchivos.set([]);
    this.enlace.reset('');
    this.errorEnlace.set(null);
  }
}

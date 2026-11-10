import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs';

// ---------- Tipos ----------
export type Modulo = 'usuarios' | 'roles' | 'asistencias' | 'calificaciones' | 'cursos';
export type Accion = 'crear' | 'modificar' | 'desactivar' | 'reabrir';

export interface Registro {
  id: number;
  fecha: string; // ISO local: 2026-11-10T09:30:00
  autor: { nombre: string; rol: 'Administrador' | 'Profesor' };
  accion: Accion;
  modulo: Modulo;
  objeto: string; // qué se afectó
  antes: string | null;
  despues: string | null;
}

interface Opcion<T extends string> { valor: T; texto: string; }

// ---------- Catálogos ----------
const MODULOS: Record<Modulo, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles y permisos',
  asistencias: 'Asistencias',
  calificaciones: 'Calificaciones',
  cursos: 'Cursos',
};

const ACCIONES: Record<Accion, string> = {
  crear: 'Creó',
  modificar: 'Modificó',
  desactivar: 'Desactivó',
  reabrir: 'Reabrió',
};

const CLASE_ACCION: Record<Accion, string> = {
  crear: 'tag--sage',
  modificar: 'tag--sky',
  desactivar: 'tag--rose',
  reabrir: 'tag--lav',
};

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './bitacora.html',
  styleUrl: './bitacora.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bitacora {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly columns = ['Fecha y hora', 'Quién', 'Acción', 'Módulo', 'Qué cambió'];
  readonly modulos: Opcion<Modulo>[] = (Object.keys(MODULOS) as Modulo[]).map((valor) => ({ valor, texto: MODULOS[valor] }));
  readonly acciones: Opcion<Accion>[] = (Object.keys(ACCIONES) as Accion[]).map((valor) => ({ valor, texto: ACCIONES[valor] }));
  readonly tamPagina = 10;

  // La bitácora es solo de lectura: aquí nunca se edita ni se borra un registro.
  // TODO: reemplazar por la llamada real al servidor (el backend debe validar que sea administrador).
  private readonly registros = signal<Registro[]>(
    generarEjemplo().sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );

  readonly cargando = signal(false);
  readonly aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  readonly pagina = signal(1);

  // ---------- Filtros ----------
  readonly filtros = this.fb.group({
    busqueda: '',
    modulo: '',
    accion: '',
    desde: '',
    hasta: '',
  });

  private readonly valores = toSignal(
    this.filtros.valueChanges.pipe(
      map(() => this.filtros.getRawValue()),
      startWith(this.filtros.getRawValue()),
    ),
    { initialValue: this.filtros.getRawValue() },
  );

  readonly rangoInvalido = computed(() => {
    const { desde, hasta } = this.valores();
    return !!desde && !!hasta && desde > hasta;
  });

  readonly hayFiltros = computed(() => Object.values(this.valores()).some((v) => v !== ''));

  // Solo filtra y ordena; no crea objetos de formulario.
  readonly filtrados = computed(() => {
    if (this.rangoInvalido()) return [];
    const { busqueda, modulo, accion, desde, hasta } = this.valores();
    const q = normalizar(busqueda.trim());

    return this.registros().filter((r) => {
      if (modulo && r.modulo !== modulo) return false;
      if (accion && r.accion !== accion) return false;
      const dia = r.fecha.slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      if (q) {
        const texto = normalizar(`${r.autor.nombre} ${r.objeto} ${r.antes ?? ''} ${r.despues ?? ''}`);
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });

  // ---------- Paginación ----------
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / this.tamPagina)));
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly visibles = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamPagina;
    return this.filtrados().slice(inicio, inicio + this.tamPagina);
  });

  readonly rango = computed(() => {
    const total = this.filtrados().length;
    if (total === 0) return '';
    const inicio = (this.paginaActual() - 1) * this.tamPagina + 1;
    const fin = Math.min(inicio + this.tamPagina - 1, total);
    return `Mostrando ${inicio}–${fin} de ${total}`;
  });

  readonly resumen = computed(() => ({
    total: this.registros().length,
    coincidencias: this.filtrados().length,
  }));

  constructor() {
    // Al cambiar cualquier filtro se vuelve a la primera página.
    this.filtros.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.pagina.set(1));
  }

  // ---------- Acciones ----------
  anterior(): void {
    this.pagina.set(Math.max(1, this.paginaActual() - 1));
  }

  siguiente(): void {
    this.pagina.set(Math.min(this.totalPaginas(), this.paginaActual() + 1));
  }

  limpiar(): void {
    this.filtros.reset();
  }

  // ---------- Etiquetas para la vista ----------
  textoAccion(a: Accion): string { return ACCIONES[a]; }
  textoModulo(m: Modulo): string { return MODULOS[m]; }
  claseAccion(a: Accion): string { return CLASE_ACCION[a]; }
}

// ---------- Utilidades ----------
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

// Datos de ejemplo para maquetar la vista. Se eliminan al conectar el servicio real.
function generarEjemplo(): Registro[] {
  const autores: Registro['autor'][] = [
    { nombre: 'Mariana Ortega', rol: 'Administrador' },
    { nombre: 'Jorge Salazar', rol: 'Profesor' },
    { nombre: 'Rosa Delgado', rol: 'Profesor' },
  ];

  const base: Omit<Registro, 'id' | 'fecha'>[] = [
    { autor: autores[0], accion: 'crear', modulo: 'usuarios', objeto: 'Cuenta de alumno: Ana Torres (202145678)', antes: null, despues: 'Rol: Alumno' },
    { autor: autores[0], accion: 'modificar', modulo: 'roles', objeto: 'Rol de Pedro Núñez', antes: 'Alumno', despues: 'Profesor' },
    { autor: autores[0], accion: 'desactivar', modulo: 'usuarios', objeto: 'Cuenta de Luis Ramírez (201934521)', antes: 'Activa', despues: 'Desactivada' },
    { autor: autores[1], accion: 'modificar', modulo: 'asistencias', objeto: 'Asistencia de Sofía Vega · Programación I · 12/10', antes: 'Falta', despues: 'Justificada' },
    { autor: autores[1], accion: 'modificar', modulo: 'calificaciones', objeto: 'Examen parcial 1 · Carlos Mejía', antes: '6.5', despues: '7.0' },
    { autor: autores[2], accion: 'crear', modulo: 'asistencias', objeto: 'Pase de lista · Bases de datos · Grupo 2', antes: null, despues: '28 presentes, 2 faltas' },
    { autor: autores[2], accion: 'modificar', modulo: 'calificaciones', objeto: 'Tarea 3 · Valeria Cruz', antes: '8.0', despues: '9.0' },
    { autor: autores[0], accion: 'reabrir', modulo: 'cursos', objeto: 'Cálculo I · Grupo 1', antes: 'Cerrado', despues: 'Abierto' },
    { autor: autores[1], accion: 'modificar', modulo: 'asistencias', objeto: 'Asistencia de Iván Rojas · Programación I · 14/10', antes: 'Presente', despues: 'Falta' },
    { autor: autores[0], accion: 'modificar', modulo: 'usuarios', objeto: 'Datos de Elena Soto', antes: 'Carrera: Biología', despues: 'Carrera: Química' },
  ];

  const ahora = Date.now();
  return Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    fecha: iso(new Date(ahora - (i * 185 + 20) * 60_000)),
    ...base[i % base.length],
  }));
}

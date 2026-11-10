import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, map } from 'rxjs';
import { MINIMO_ASISTENCIA } from '../../../models/profesor.models';
import { ProfesorService } from '../../../services/profesor.services';
import { normalizar } from '../../../utils/texto';

/** HU-20: el profesor ve nombre y matrícula de los alumnos inscritos en su curso (solo lectura). */
@Component({
  selector: 'app-lista-alumnos',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './lista-alumnos.html',
  styleUrl: './lista-alumnos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaAlumnos {
  private readonly profesor = inject(ProfesorService);

  readonly curso = this.profesor.cursoActivo;
  readonly minimo = MINIMO_ASISTENCIA;
  readonly columns = ['#', 'Matrícula', 'Nombre del alumno', '% asistencia'];

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

  /** Todos los inscritos, en orden alfabético, con su % de asistencia (HU-02). */
  private readonly todos = computed(() => {
    const c = this.curso();
    if (!c) return [];
    return [...c.alumnos]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((alumno) => ({ alumno, pct: this.profesor.porcentajeAsistencia(c.id, alumno.id) }));
  });

  readonly total = computed(() => this.todos().length);
  readonly enRiesgo = computed(() => this.todos().filter((r) => r.pct !== null && r.pct < this.minimo).length);

  readonly rows = computed(() => {
    const q = this.texto();
    return this.todos().filter((r) => !q || normalizar(`${r.alumno.nombre} ${r.alumno.matricula}`).includes(q));
  });

  readonly mensajeVacio = computed(() =>
    this.total() === 0
      ? 'Este grupo aún no tiene alumnos inscritos.'
      : `No se encontraron alumnos para «${this.busqueda.value.trim()}».`,
  );
}

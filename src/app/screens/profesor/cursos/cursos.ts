import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, map } from 'rxjs';
import { ColumnaCurso } from '../../../models/profesor.models';
import { ProfesorService } from '../../../services/profesor.services';
import { normalizar } from '../../../utils/texto';

const ESTADOS: Record<ColumnaCurso, { texto: string; clase: string }> = {
  configurar: { texto: 'Sin evaluaciones', clase: 'tag--peach' },
  captura: { texto: 'En captura', clase: 'tag--sky' },
  publicado: { texto: 'Publicadas', clase: 'tag--sage' },
};

/** HU-03 / RF-10: el profesor consulta sus cursos asignados y entra a alumnos, asistencias y tareas. */
@Component({
  selector: 'app-mis-cursos',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './cursos.html',
  styleUrl: './cursos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisCursos {
  private readonly profesor = inject(ProfesorService);

  readonly columns = ['Materia', 'Grupo', 'Horario', 'Aula / Modalidad', 'Alumnos', 'Evaluaciones', 'Acciones'];

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

  readonly total = computed(() => this.profesor.cursos().length);
  readonly periodo = computed(() => this.profesor.cursos()[0]?.periodo ?? '');

  readonly rows = computed(() => {
    const q = this.texto();
    return this.profesor
      .cursos()
      .filter((c) => !q || normalizar(`${c.nombre} ${c.clave} ${c.grupo}`).includes(q))
      .map((c) => ({
        curso: c,
        estado: ESTADOS[this.profesor.progreso(c).columna],
        ruta: (tab: string) => ['/profesor/cursos', c.id, tab],
      }));
  });

  readonly mensajeVacio = computed(() =>
    this.total() === 0 ? 'Aún no tienes cursos asignados. Contacta al administrador.' : `No se encontraron cursos para «${this.busqueda.value.trim()}».`,
  );
}

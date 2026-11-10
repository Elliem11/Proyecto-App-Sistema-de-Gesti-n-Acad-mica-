import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProfesorService } from '../services/profesor.services';

/**
 * Se ejecuta en /profesor/cursos/:id/...
 * - Si el curso no existe (o el id no es un número), regresa a "Mis cursos".
 * - Si existe, lo deja como curso activo para las vistas hijas.
 * Cuando exista el back, aquí también se valida que el curso sea del profesor (RNF-03).
 */
export const cursoGuard: CanActivateFn = (route) => {
  const profesor = inject(ProfesorService);
  const id = Number(route.paramMap.get('id'));

  if (!Number.isInteger(id) || !profesor.existeCurso(id)) {
    return inject(Router).createUrlTree(['/profesor/cursos']);
  }
  profesor.seleccionarCurso(id);
  return true;
};

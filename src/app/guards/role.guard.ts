import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Comprueba el rol requerido por la ruta o su ruta padre. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data['role'] ?? route.parent?.data['role'];
  if (auth.role() === requiredRole) return true;
  return router.parseUrl(auth.homeRoute());
};

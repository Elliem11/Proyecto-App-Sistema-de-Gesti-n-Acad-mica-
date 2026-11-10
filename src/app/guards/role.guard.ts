import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Uso: data: { role: 'admin' } */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.role() === route.data['role']) return true;
  return router.parseUrl(auth.homeRoute());
};

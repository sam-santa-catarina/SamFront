import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const forcePasswordChangeGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.requiresPasswordChange()) {
    return router.createUrlTree(['/iniciar-sesion']);
  }

  return true;
};
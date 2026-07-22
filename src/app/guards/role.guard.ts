// guards/role.guard.ts
import { CanActivateChildFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateChildFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const rolesPermitidos = getRolesFromRoute(route);
  const userRole = auth.currentUser()?.id_rol_usuario;

  if (!userRole) {
    return router.createUrlTree(['/iniciar-sesion']);
  }

  if (!rolesPermitidos || !rolesPermitidos.includes(userRole)) {
    return router.createUrlTree([auth.getRedirectRouteForRole(userRole)]);
  }

  return true;
};

function getRolesFromRoute(route: ActivatedRouteSnapshot): number[] | undefined {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    if (current.data?.['roles']) {
      return current.data['roles'] as number[];
    }
    current = current.parent;
  }
  return undefined;
}
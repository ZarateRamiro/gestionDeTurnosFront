import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Guarda de navegación: redirige a login si no hay una sesión activa. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

/** Además de autenticar, verifica el rol para elegir qué páginas puede abrir cada perfil. */
export const roleGuard = (role: 'ADMINISTRADOR' | 'CLIENTE'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.rol() === role) return true;
  return router.createUrlTree([auth.rol() === 'CLIENTE' ? '/turnos' : '/']);
};

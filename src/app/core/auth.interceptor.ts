import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Agrega JWT a peticiones protegidas y limpia la sesión si el backend responde 401. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token();
  if (!token || request.url.endsWith('/auth/login')) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  // clone() mantiene inmutable la solicitud original de HttpClient.
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error) => {
      if (error.status === 401) { auth.logout(); void router.navigateByUrl('/login'); }
      return throwError(() => error);
    }),
  );
};

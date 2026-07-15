import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { Auth } from '../services/auth';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

const EXCLUDED_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token'];

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (EXCLUDED_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }

  return next(req).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      if (isRefreshing) {
        return refreshedToken$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
          )
        );
      }

      isRefreshing = true;
      refreshedToken$.next(null);

      return auth.refreshToken().pipe(
        switchMap((res) => {
          isRefreshing = false;
          refreshedToken$.next(res.access_token);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.access_token}` } }));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          auth.logout();
          router.navigateByUrl('/iniciar-sesion');
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
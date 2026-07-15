import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, ApiErrorBody } from '../models/auth.model';

export interface LoginResult {
  role: number;
  requiereCambioContrasena: boolean;
}

export interface AuthError {
  code: string;
  message: string;
  bloqueadoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  readonly accessToken = signal<string | null>(null);
  readonly currentUser = signal<LoginResponse['user'] | null>(null);

  private readonly lockouts = new Map<string, string>();

  login(correo: string, contrasena: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { correo, contrasena }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.accessToken.set(res.tokens.access_token);
          this.currentUser.set(res.user);
          this.lockouts.delete(correo);
        }),
        map((res) => ({
          role: res.user.id_rol_usuario,
          requiereCambioContrasena: res.requiere_cambio_contrasena
        })),
        catchError((err: HttpErrorResponse) => {
          const body = err.error as ApiErrorBody;
          if (err.status === 423 && body.bloqueado_hasta) {
            this.lockouts.set(correo, body.bloqueado_hasta);
          }
          return throwError(() => this.toAuthError(err, body));
        })
      );
  }

  refreshToken(): Observable<{ access_token: string; expires_in: string }> {
    return this.http
      .post<{ message: string; tokens: { access_token: string; expires_in: string } }>(
        `${this.baseUrl}/refresh-token`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((res) => this.accessToken.set(res.tokens.access_token)),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.toAuthError(err, err.error as ApiErrorBody))
        ),
      ) as unknown as Observable<{ access_token: string; expires_in: string }>;
  }

  changePassword(contrasena_actual: string, contrasena_nueva: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.baseUrl}/change-password`,
        { contrasena_actual, contrasena_nueva }
      )
      .pipe(
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.toAuthError(err, err.error as ApiErrorBody))
        )
      );
  }

  logout(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  getLockoutState(correo: string): { isLocked: boolean; remainingMinutes: number } {
    const bloqueadoHasta = this.lockouts.get(correo);
    if (!bloqueadoHasta) {
      return { isLocked: false, remainingMinutes: 0 };
    }

    const remainingMs = new Date(bloqueadoHasta).getTime() - Date.now();
    if (remainingMs <= 0) {
      this.lockouts.delete(correo);
      return { isLocked: false, remainingMinutes: 0 };
    }

    // Redondear hacia arriba para mostrar el minuto completo
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { isLocked: true, remainingMinutes };
  }

  getRedirectRouteForRole(role: number): string {
    switch (role) {
      case 1: return '/administrador/inicio'; // Administrador
      case 2: return '/supervisor/inicio';    // Supervisor
      case 3: return '/capturista/inicio';    // Capturista
      default: return '/iniciar-sesion';
    }
  }

  private toAuthError(err: HttpErrorResponse, body: ApiErrorBody): AuthError {
    if (err.status === 423) {
      return { code: 'ACCOUNT_LOCKED', message: body.message ?? 'Cuenta bloqueada', bloqueadoHasta: body.bloqueado_hasta };
    }
    if (err.status === 403 && body.message?.includes('eliminada')) {
      return { code: 'ACCOUNT_DELETED', message: body.message };
    }
    if (err.status === 429) {
      return { code: 'RATE_LIMITED', message: body.message ?? 'Demasiados intentos' };
    }
    if (err.status === 401) {
      return { code: 'INVALID_CREDENTIALS', message: body.message ?? 'Credenciales inválidas' };
    }
    return { code: 'UNKNOWN', message: body.message ?? 'Error en el servidor' };
  }
}
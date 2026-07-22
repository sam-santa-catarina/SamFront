import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, RefreshResponse, ApiErrorBody, UsuarioListado, UsuariosResponse } from '../models/auth.model';

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

  readonly requiresPasswordChange = signal(false);

  login(correo: string, contrasena: string): Observable<LoginResult> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, { correo, contrasena }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.accessToken.set(res.tokens.access_token);
          this.currentUser.set(res.user);
          this.requiresPasswordChange.set(res.requiere_cambio_contrasena);
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

  markPasswordChanged(): void {
    this.requiresPasswordChange.set(false);
  }

  /**
   * Refresca el access_token usando la cookie httpOnly.
   * También repuebla currentUser y requiresPasswordChange,
   * porque el backend ahora devuelve la misma forma que login.
   */
  refreshToken(): Observable<{ access_token: string; expires_in: string }> {
    return this.http
      .post<RefreshResponse>(`${this.baseUrl}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.accessToken.set(res.tokens.access_token);
          this.currentUser.set(res.user);
          this.requiresPasswordChange.set(res.requiere_cambio_contrasena);
        }),
        map((res) => res.tokens),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.toAuthError(err, err.error as ApiErrorBody))
        ),
      );
  }

  /**
   * Se llama una vez al arrancar la app (ver app.config.ts).
   * Si no hay cookie válida, falla en silencio y la app arranca
   * con sesión vacía (los guards se encargan de mandar a login).
   */
  restoreSession(): Observable<boolean> {
    return this.refreshToken().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  listar(): Observable<UsuarioListado[]> {
    return this.http
      .get<UsuariosResponse>(`${this.baseUrl}/`)
      .pipe(map((res) => res.data));
  }

  reiniciar(id_usuario: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/reset-user`,
      { id_usuario }
    );
  }

  changePassword(contrasena_actual: string, contrasena_nueva: string): Observable<{ message: string }> {
    return this.http
    .post<RefreshResponse & { message: string }>(
      `${this.baseUrl}/change-password`,
      { contrasena_actual, contrasena_nueva },
      { withCredentials: true }
    )
    .pipe(
      tap((res) => {
        this.accessToken.set(res.tokens.access_token);
        this.currentUser.set(res.user);
        this.requiresPasswordChange.set(res.requiere_cambio_contrasena);
      }),
      map((res) => ({ message: res.message })),
      catchError((err: HttpErrorResponse) =>
        throwError(() => this.toAuthError(err, err.error as ApiErrorBody))
      )
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        map(() => void 0),
        tap(() => this.clearLocalSession()),
        catchError(() => {
          // Aunque el backend falle, limpiamos la sesión local para que
          // el usuario no quede "atorado" viendo pantallas protegidas.
          this.clearLocalSession();
          return of(void 0);
        })
      );
  }

  private clearLocalSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.requiresPasswordChange.set(false);
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

    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { isLocked: true, remainingMinutes };
  }

  getRedirectRouteForRole(role: number): string {
    switch (role) {
      case 1: return '/administrador/inicio';
      case 2: return '/supervisor/inicio';
      case 3: return '/dependencia/inicio';
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
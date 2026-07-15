import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

export type UserRole = 'admin' | 'supervisor' | 'operador';

export interface LoginResponse {
  token: string;
  role: UserRole;
  displayName: string;
}

export interface LockoutState {
  isLocked: boolean;
  remainingSeconds: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 5 * 60;
const STORAGE_PREFIX = 'sam_login_attempts_';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  login(email: string, password: string): Observable<LoginResponse> {
    const lockout = this.getLockoutState(email);
    if (lockout.isLocked) {
      return throwError(() => ({
        code: 'ACCOUNT_LOCKED',
        message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${Math.ceil(
          lockout.remainingSeconds / 60
        )} minuto(s).`,
      })).pipe(delay(300));
    }

    return this.mockAuthenticate(email, password).pipe(delay(900));
  }

  private mockAuthenticate(email: string, password: string): Observable<LoginResponse> {
    const isValid = email === 'admin@santacatarina.gob.mx' && password === 'Demo#2024!';

    if (!isValid) {
      this.registerFailedAttempt(email);
      return throwError(() => ({
        code: 'INVALID_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos.',
      }));
    }

    this.clearAttempts(email);
    return of({
      token: 'mock-jwt-token',
      role: 'admin',
      displayName: 'Administrador',
    });
  }

  getLockoutState(email: string): LockoutState {
  const record = this.readRecord(email);
  if (!record?.lockedUntil) {
    return { isLocked: false, remainingSeconds: 0 };
  }

    const remainingMs = record.lockedUntil - Date.now();
    if (remainingMs <= 0) {
      this.clearAttempts(email);
      return { isLocked: false, remainingSeconds: 0 };
    }

    return { isLocked: true, remainingSeconds: Math.ceil(remainingMs / 1000) };
  }

  private registerFailedAttempt(email: string): void {
    const record = this.readRecord(email) ?? { attempts: 0, lockedUntil: null };
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
    }

    this.writeRecord(email, record);
  }

  private clearAttempts(email: string): void {
    localStorage.removeItem(this.storageKey(email));
  }

  private readRecord(email: string): { attempts: number; lockedUntil: number | null } | null {
    const raw = localStorage.getItem(this.storageKey(email));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private writeRecord(email: string, record: { attempts: number; lockedUntil: number | null }): void {
    localStorage.setItem(this.storageKey(email), JSON.stringify(record));
  }

  private storageKey(email: string): string {
    return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
  }

  getRedirectRouteForRole(role: UserRole): string {
    switch (role) {
      case 'admin':
        return '/panel/administracion';
      case 'supervisor':
        return '/panel/supervision';
      case 'operador':
      default:
        return '/panel/inicio';
    }
  }
}
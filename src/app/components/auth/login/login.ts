import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { Auth, AuthError } from '../../../services/auth';
import {
  noEmojiValidator,
  noWhitespaceValidator,
  passwordComplexityValidator,
  passwordsMatchValidator,
} from './login.validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isLocked = signal(false);
  readonly lockRemainingMinutes = signal(0);

  readonly changingPassword = signal(false);
  readonly changePasswordError = signal<string | null>(null);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  private pendingRole: number | null = null;

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(254),
        Validators.email,
        noWhitespaceValidator(),
        noEmojiValidator(),
      ],
    ],
    password: [
      '',
      [Validators.required, noWhitespaceValidator(), noEmojiValidator()],
    ],
  });

  readonly changePasswordForm = this.fb.nonNullable.group(
    {
      nuevaContrasena: [
        '',
        [
          Validators.required,
          noWhitespaceValidator(),
          noEmojiValidator(),
          passwordComplexityValidator(),
        ],
      ],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator('nuevaContrasena', 'confirmarContrasena') }
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.isLocked() || this.loading()) {
      return;
    }

    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);

    this.auth
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.pendingRole = response.role;

          if (response.requiereCambioContrasena) {
            // auth.requiresPasswordChange ya quedó en true (lo setea Auth.login vía tap).
            // El template debe mostrar el formulario de cambio basado en auth.requiresPasswordChange().
            return;
          }

          const redirectTo = this.auth.getRedirectRouteForRole(response.role);
          this.router.navigateByUrl(redirectTo);
        },
        error: (err: AuthError) => {
          this.loading.set(false);

          if (err.code === 'ACCOUNT_LOCKED') {
            this.startLockoutCountdown(email);
            return;
          }

          this.errorMessage.set('Usuario o contraseña incorrectos.');

          const lockout = this.auth.getLockoutState(email);
          if (lockout.isLocked) {
            this.startLockoutCountdown(email);
          }
        },
      });
  }

  onSubmitPasswordChange(): void {
    if (this.changingPassword()) {
      return;
    }

    this.changePasswordError.set(null);

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { nuevaContrasena } = this.changePasswordForm.getRawValue();
    const { password: contrasenaActual } = this.form.getRawValue();

    this.changingPassword.set(true);

    this.auth
      .changePassword(contrasenaActual, nuevaContrasena)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.auth.markPasswordChanged();

          const redirectTo = this.pendingRole
            ? this.auth.getRedirectRouteForRole(this.pendingRole)
            : '/iniciar-sesion';
          this.router.navigateByUrl(redirectTo);
        },
        error: (err: AuthError) => {
          this.changingPassword.set(false);
          this.changePasswordError.set(err.message || 'No se pudo actualizar la contraseña.');
        },
      });
  }

  private startLockoutCountdown(email: string): void {
    const lockout = this.auth.getLockoutState(email);
    this.isLocked.set(true);
    this.lockRemainingMinutes.set(lockout.remainingMinutes);
    this.errorMessage.set(
      `Demasiados intentos fallidos. Intenta de nuevo en ${lockout.remainingMinutes} minuto(s).`
    );

    interval(60000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const current = this.auth.getLockoutState(email);
        if (!current.isLocked) {
          this.isLocked.set(false);
          this.lockRemainingMinutes.set(0);
          this.errorMessage.set(null);
          return;
        }
        this.lockRemainingMinutes.set(current.remainingMinutes);
        this.errorMessage.set(
          `Demasiados intentos fallidos. Intenta de nuevo en ${current.remainingMinutes} minuto(s).`
        );
      });
  }
}
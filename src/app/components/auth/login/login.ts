import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import { Auth } from '../../../services/auth';
import { noEmojiValidator, noWhitespaceValidator } from './login.validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isLocked = signal(false);
  readonly lockRemainingSeconds = signal(0);

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

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
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
          const redirectTo = this.auth.getRedirectRouteForRole(response.role);
          this.router.navigateByUrl(redirectTo);
        },
        error: (err: { code?: string; message?: string }) => {
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

  private startLockoutCountdown(email: string): void {
    const lockout = this.auth.getLockoutState(email);
    this.isLocked.set(true);
    this.lockRemainingSeconds.set(lockout.remainingSeconds);
    this.errorMessage.set(
      'Demasiados intentos fallidos. Tu cuenta se bloqueó temporalmente.'
    );

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const current = this.auth.getLockoutState(email);
        if (!current.isLocked) {
          this.isLocked.set(false);
          this.lockRemainingSeconds.set(0);
          this.errorMessage.set(null);
          return;
        }
        this.lockRemainingSeconds.set(current.remainingSeconds);
      });
  }
}
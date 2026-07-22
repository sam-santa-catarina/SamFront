import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../services/auth';
import { UsuarioListado } from '../../../models/auth.model';

const ESTATUS_ELIMINADO = 4;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './usuarios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly usuarios = signal<UsuarioListado[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly usuarioAReiniciar = signal<UsuarioListado | null>(null);
  readonly reiniciando = signal(false);
  readonly reinicioError = signal<string | null>(null);
  readonly reinicioExitoso = signal<string | null>(null);

  readonly estatusEliminado = ESTATUS_ELIMINADO;

  constructor() {
    this.cargarUsuarios();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  cerrarSesion(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/iniciar-sesion');
    });
  }

  private cargarUsuarios(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('No se pudo cargar la lista de usuarios. Intenta de nuevo.');
        },
      });
  }

  abrirConfirmacion(usuario: UsuarioListado): void {
    this.reinicioError.set(null);
    this.usuarioAReiniciar.set(usuario);
  }

  cancelarReinicio(): void {
    if (this.reiniciando()) return;
    this.usuarioAReiniciar.set(null);
    this.reinicioError.set(null);
  }

  confirmarReinicio(): void {
    const usuario = this.usuarioAReiniciar();
    if (!usuario || this.reiniciando()) return;

    this.reiniciando.set(true);
    this.reinicioError.set(null);

    this.auth
      .reiniciar(usuario.id_usuario)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reiniciando.set(false);
          this.usuarioAReiniciar.set(null);
          this.reinicioExitoso.set(`Se reinició la cuenta de ${usuario.nombre_usuario}.`);
          setTimeout(() => this.reinicioExitoso.set(null), 4000);
        },
        error: () => {
          this.reiniciando.set(false);
          this.reinicioError.set('No se pudo reiniciar el usuario. Intenta de nuevo.');
        },
      });
  }
}
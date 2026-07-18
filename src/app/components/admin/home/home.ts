import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-admin',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeAdmin {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

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
}

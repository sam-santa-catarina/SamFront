import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../services/auth';
import { AuditoriaService } from '../../../services/auditoria';
import { AuditoriaRegistro } from '../../../models/auditoria.model';

const LIMITE = 30;

const ACCIONES_DISPONIBLES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'REGISTER', label: 'Registro' },
  { value: 'LOGIN', label: 'Inicio de sesión' },
  { value: 'LOGIN_FAILED', label: 'Intento fallido de login' },
  { value: 'REFRESH_TOKEN', label: 'Renovación de token' },
  { value: 'CHANGE_PASSWORD', label: 'Cambio de contraseña' },
  { value: 'LOGOUT', label: 'Cierre de sesión' },
  { value: 'RESET_USER', label: 'Reinicio de cuenta' },
  { value: 'ACCOUNT_UNLOCKED', label: 'Desbloqueo de cuenta' },
];

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './auditoria.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auditoria {
  private readonly fb = inject(FormBuilder);
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly acciones = ACCIONES_DISPONIBLES;

  readonly registros = signal<AuditoriaRegistro[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly expandedRow = signal<number | null>(null);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  private offset = 0;

  readonly filtroForm = this.fb.nonNullable.group({
    id_usuario: [''],
    correo_electronico: [''],
    accion: [''],
  });

  constructor() {
    this.cargarInicial();
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

  buscar(): void {
    this.offset = 0;
    this.cargarInicial();
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({ id_usuario: '', correo_electronico: '', accion: '' });
    this.buscar();
  }

  toggleDetalle(id: number): void {
    this.expandedRow.update((actual) => (actual === id ? null : id));
  }

  private construirFiltros() {
    const { id_usuario, correo_electronico, accion } = this.filtroForm.getRawValue();
    return {
      id_usuario: id_usuario ? Number(id_usuario) : null,
      correo_electronico: correo_electronico || null,
      accion: accion || null,
    };
  }

  private cargarInicial(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auditoriaService
      .listar(0, LIMITE, this.construirFiltros())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.registros.set(res.data);
          this.total.set(res.total);
          this.hasMore.set(res.hasMore);
          this.offset = res.data.length;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('No se pudo cargar la auditoría. Intenta de nuevo.');
        },
      });
  }

  cargarMas(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.loadingMore.set(true);

    this.auditoriaService
      .listar(this.offset, LIMITE, this.construirFiltros())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.registros.update((actuales) => [...actuales, ...res.data]);
          this.hasMore.set(res.hasMore);
          this.offset += res.data.length;
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
          this.errorMessage.set('No se pudo cargar más registros.');
        },
      });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  colorAccion(accion: string): string {
    switch (accion) {
      case 'LOGIN': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REGISTER': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOGOUT': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'CHANGE_PASSWORD': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESET_USER':
      case 'LOGIN_FAILED': return 'bg-red-50 text-red-700 border-red-200';
      case 'ACCOUNT_UNLOCKED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
}
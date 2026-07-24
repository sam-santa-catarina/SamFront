import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../services/auth';
import { ApoyosService, ImportResultado } from '../../../services/apoyo';

interface EstadoCarga {
  archivo: File | null;
  cargando: boolean;
  error: string | null;
}

interface Notificacion {
  tipo: 'exito' | 'error';
  titulo: string;
  detalle?: string;
}

@Component({
  selector: 'app-actualizar-montos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './actualizar-montos.html'
})
export class ActualizarMontosComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly apoyosService = inject(ApoyosService);

  readonly currentUser = this.auth.currentUser;

  readonly sidebarOpen = signal(false);
  readonly userMenuOpen = signal(false);

  readonly descargando = signal(false);
  readonly confirmando = signal(false);
  readonly notificacion = signal<Notificacion | null>(null);

  readonly estado = signal<EstadoCarga>({
    archivo: null,
    cargando: false,
    error: null
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  cerrarSesion(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/iniciar-sesion'));
  }

  descargarPlantilla(): void {
    this.descargando.set(true);
    this.apoyosService.exportarSinMonto().subscribe({
      next: () => {
        this.descargando.set(false);
      },
      error: (err: Error) => {
        this.descargando.set(false);
        this.notificacion.set({
          tipo: 'error',
          titulo: 'No se pudo descargar el archivo',
          detalle: err.message
        });
      }
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.estado.update((e) => ({ ...e, archivo: file, error: null }));
    input.value = '';
  }

  quitarArchivo(): void {
    this.estado.update((e) => ({ ...e, archivo: null, error: null }));
  }

  abrirConfirmacion(): void {
    if (!this.estado().archivo) return;
    this.confirmando.set(true);
  }

  cancelarConfirmacion(): void {
    if (this.estado().cargando) return;
    this.confirmando.set(false);
  }

  confirmarCarga(): void {
    const archivo = this.estado().archivo;
    if (!archivo) return;

    this.estado.update((e) => ({ ...e, cargando: true, error: null }));

    this.apoyosService.actualizarMonto(archivo).subscribe({
      next: (resultado: ImportResultado) => {
        this.estado.set({ archivo: null, cargando: false, error: null });
        this.confirmando.set(false);

        if (resultado.tipo === 'exito') {
          this.notificacion.set({
            tipo: 'exito',
            titulo: resultado.mensaje
          });
        } else {
          this.notificacion.set({
            tipo: 'error',
            titulo: 'Se encontraron filas con errores',
            detalle: resultado.resumen
              ? `${resultado.resumen.errores} fila(s) con error de ${resultado.resumen.total_procesados}. Se descargó un Excel con el detalle.`
              : 'Se descargó un Excel con el detalle de los errores.'
          });
        }
      },
      error: (err: Error) => {
        this.estado.update((e) => ({ ...e, cargando: false, error: err.message }));
        this.confirmando.set(false);
      }
    });
  }

  cerrarNotificacion(): void {
    this.notificacion.set(null);
  }
}
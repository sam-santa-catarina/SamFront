import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';

type TipoCarga = 'otorgados' | 'registrados';

interface FilaApoyo {
  nombre: string;
  curp: string;
  sector: string;
  apoyo: string;
}

interface EstadoCarga {
  archivo: File | null;
  filas: FilaApoyo[];
}

@Component({
  selector: 'app-carga',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './carga.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaApoyos {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly tabActivo = signal<TipoCarga>('otorgados');

  readonly estadoOtorgados = signal<EstadoCarga>({ archivo: null, filas: [] });
  readonly estadoRegistrados = signal<EstadoCarga>({ archivo: null, filas: [] });

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

  cambiarTab(tab: TipoCarga): void {
    this.tabActivo.set(tab);
  }

  estadoDe(tab: TipoCarga): WritableSignal<EstadoCarga> {
    return tab === 'otorgados' ? this.estadoOtorgados : this.estadoRegistrados;
  }

  tituloDe(tab: TipoCarga): string {
    return tab === 'otorgados' ? 'Apoyos otorgados' : 'Apoyos registrados';
  }

  descripcionDe(tab: TipoCarga): string {
    return tab === 'otorgados'
      ? 'Carga el archivo con los apoyos ya entregados a la población.'
      : 'Carga el archivo con las solicitudes de apoyo registradas pendientes de entrega.';
  }

  descargarPlantilla(tab: TipoCarga): void {
    const nombreArchivo =
      tab === 'otorgados' ? 'plantilla-apoyos-otorgados.xlsx' : 'plantilla-apoyos-registrados.xlsx';

    // TODO: reemplazar por la ruta real una vez que la plantilla exista en assets/plantillas
    const link = document.createElement('a');
    link.href = `/assets/plantillas/${nombreArchivo}`;
    link.download = nombreArchivo;
    link.click();
  }

  onArchivoSeleccionado(tab: TipoCarga, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;

    // TODO: reemplazar por el parseo real del Excel (SheetJS) al conectar con el backend
    const filasDemo: FilaApoyo[] = [
      { nombre: 'María Guadalupe Torres López', curp: 'TOLM900101MDFRPR05', sector: 'Desarrollo Rural', apoyo: 'Borregas' },
      { nombre: 'José Antonio Ramírez Cruz', curp: 'RACJ850612HDFMRS02', sector: 'Desarrollo Social', apoyo: 'Calentador solar' },
      { nombre: 'Ana Karen Hernández Pérez', curp: 'HEPA930309MDFRRN08', sector: 'Desarrollo Rural', apoyo: 'Tinacos para ganado' },
    ];

    this.estadoDe(tab).set({ archivo, filas: filasDemo });
  }

  quitarArchivo(tab: TipoCarga): void {
    this.estadoDe(tab).set({ archivo: null, filas: [] });
    const input = document.getElementById(`input-${tab}`) as HTMLInputElement | null;
    if (input) input.value = '';
  }

  aprobar(tab: TipoCarga): void {
    // TODO: conectar con el endpoint de aprobación de carga masiva
    console.log(`Aprobar carga de apoyos ${tab}`, this.estadoDe(tab)().filas);
  }
}
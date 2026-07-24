import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { ApoyosService, ApoyoOtorgadoResponse, ApoyoPendienteResponse } from '../../../services/apoyo';

const LIMITE = 30;

type TipoCarga = 'otorgados' | 'pendientes';

interface ApoyoOtorgado {
  nombreCompleto: string;
  curp: string;
  localidad: string;
  calle: string;
  numeroExterior: string;
  cantidad: number;
  conceptoApoyo: string;
  programa: string;
  monto: number;
  fechaApoyo: string;
  fechaCarga: string;
}

interface ApoyoPendiente {
  nombreCompleto: string;
  curp: string;
  conceptoApoyo: string;
  programa: string;
  estatus: string;
  fechaCarga: string;
}

@Component({
  selector: 'app-home-dependencia',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeDependencia implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly apoyosService = inject(ApoyosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly tabActivo = signal<TipoCarga>('otorgados');
  readonly filtroCurp = signal('');

  // Estado de carga
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);
  
  // Totales
  readonly totalOtorgados = signal(0);
  readonly totalPendientes = signal(0);
  readonly hasMoreOtorgados = signal(false);
  readonly hasMorePendientes = signal(false);

  // Datos que se muestran en la tabla
  readonly apoyosOtorgados = signal<ApoyoOtorgado[]>([]);
  readonly apoyosPendientes = signal<ApoyoPendiente[]>([]);

  private offsetOtorgados = 0;
  private offsetPendientes = 0;

  ngOnInit(): void {
    this.cargarInicial();
  }

  private cargarInicial(): void {
    this.offsetOtorgados = 0;
    this.offsetPendientes = 0;
    this.cargarOtorgados(true);
    this.cargarPendientes(true);
  }

  private cargarOtorgados(reset: boolean = false): void {
    if (reset) {
      this.loading.set(true);
      this.offsetOtorgados = 0;
    }

    this.errorMessage.set(null);

    const params: any = { limit: LIMITE, offset: reset ? 0 : this.offsetOtorgados };
    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    if (curpBuscado && curpBuscado.length >= 4) {
      params.curp = curpBuscado;
    }

    this.apoyosService.listarApoyos(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const nuevos = response.data.map((apoyo: ApoyoOtorgadoResponse) => ({
            nombreCompleto: apoyo.nombre_completo,
            curp: apoyo.curp_beneficiario,
            localidad: apoyo.nombre_localidad,
            calle: apoyo.calle,
            numeroExterior: apoyo.numero_exterior,
            cantidad: apoyo.cantidad,
            conceptoApoyo: apoyo.nombre_concepto,
            programa: apoyo.programa,
            monto: apoyo.monto,
            fechaApoyo: apoyo.fecha_apoyo,
            fechaCarga: apoyo.created_at
          }));

          if (reset) {
            this.apoyosOtorgados.set(nuevos);
          } else {
            this.apoyosOtorgados.update(actuales => [...actuales, ...nuevos]);
          }

          this.totalOtorgados.set(response.total);
          this.hasMoreOtorgados.set(response.hasMore);
          this.offsetOtorgados += nuevos.length;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('No se pudieron cargar los apoyos otorgados.');
        }
      });
  }

  private cargarPendientes(reset: boolean = false): void {
    if (reset) {
      this.loading.set(true);
      this.offsetPendientes = 0;
    }

    this.errorMessage.set(null);

    const params: any = { limit: LIMITE, offset: reset ? 0 : this.offsetPendientes };
    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    if (curpBuscado && curpBuscado.length >= 4) {
      params.curp = curpBuscado;
    }

    this.apoyosService.listarApoyosPendientes(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const nuevos = response.data.map((apoyo: ApoyoPendienteResponse) => ({
            nombreCompleto: apoyo.nombre_completo,
            curp: apoyo.curp_beneficiario,
            conceptoApoyo: apoyo.nombre_concepto,
            programa: apoyo.programa,
            estatus: apoyo.estatus,
            fechaCarga: apoyo.created_at
          }));

          if (reset) {
            this.apoyosPendientes.set(nuevos);
          } else {
            this.apoyosPendientes.update(actuales => [...actuales, ...nuevos]);
          }

          this.totalPendientes.set(response.total);
          this.hasMorePendientes.set(response.hasMore);
          this.offsetPendientes += nuevos.length;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('No se pudieron cargar los apoyos pendientes.');
        }
      });
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

  cambiarTab(tab: TipoCarga): void {
    this.tabActivo.set(tab);
  }

  descargarPlantilla(tab: TipoCarga): void {
    const nombreArchivo =
      tab === 'otorgados' ? 'plantilla-apoyos-otorgados.xlsx' : 'plantilla-apoyos-pendientes.xlsx';

    const link = document.createElement('a');
    link.href = `/assets/plantillas/${nombreArchivo}`;
    link.download = nombreArchivo;
    link.click();
  }

  filtrarPorCurp(): void {
    // Reiniciar y recargar con filtro
    this.cargarInicial();
  }

  cargarMas(): void {
    if (this.tabActivo() === 'otorgados') {
      if (!this.hasMoreOtorgados() || this.loadingMore()) return;
      this.loadingMore.set(true);
      this.cargarOtorgados(false);
      this.loadingMore.set(false);
    } else {
      if (!this.hasMorePendientes() || this.loadingMore()) return;
      this.loadingMore.set(true);
      this.cargarPendientes(false);
      this.loadingMore.set(false);
    }
  }

  // Métodos helper para el template
  totalActual(): number {
    return this.tabActivo() === 'otorgados' ? this.totalOtorgados() : this.totalPendientes();
  }

  registrosActualesLength(): number {
    return this.tabActivo() === 'otorgados' ? this.apoyosOtorgados().length : this.apoyosPendientes().length;
  }

  hasMoreActual(): boolean {
    return this.tabActivo() === 'otorgados' ? this.hasMoreOtorgados() : this.hasMorePendientes();
  }

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
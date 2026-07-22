import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { ApoyosService, ApoyoOtorgadoResponse, ApoyoPendienteResponse } from '../../../services/apoyo';
import { DependenciasService, Dependencia } from '../../../services/dependencias';

const LIMITE = 30;

type TipoCarga = 'otorgados' | 'pendientes';

interface ApoyoOtorgado {
  nombreCompleto: string;
  curp: string;
  dependencia: string;
  localidad: string;
  calle: string;
  numeroExterior: string;
  cantidad: number;
  conceptoApoyo: string;
  programa: string;
  monto: number;
  fechaApoyo: string;
}

interface ApoyoPendiente {
  nombreCompleto: string;
  curp: string;
  dependencia: string;
  conceptoApoyo: string;
  programa: string;
}

@Component({
  selector: 'app-home-supervisor',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSupervisor implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly apoyosService = inject(ApoyosService);
  private readonly dependenciasService = inject(DependenciasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly tabActivo = signal<TipoCarga>('otorgados');
  readonly filtroCurp = signal('');
  readonly filtroDependencia = signal('');

  // Estado de carga
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Totales
  readonly totalOtorgados = signal(0);
  readonly totalPendientes = signal(0);
  readonly hasMoreOtorgados = signal(false);
  readonly hasMorePendientes = signal(false);

  // Lista de dependencias desde el backend
  readonly dependencias = signal<Dependencia[]>([]);

  // Datos que se muestran en la tabla
  readonly apoyosOtorgados = signal<ApoyoOtorgado[]>([]);
  readonly apoyosPendientes = signal<ApoyoPendiente[]>([]);

  private offsetOtorgados = 0;
  private offsetPendientes = 0;

  ngOnInit(): void {
    this.cargarDependencias();
    this.cargarInicial();
  }

  private cargarDependencias(): void {
    this.dependenciasService.listarDependencias().subscribe({
      next: (deps) => {
        this.dependencias.set(deps);
      },
      error: (error) => {
        console.error('Error al cargar dependencias:', error);
      }
    });
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
    } else {
      this.loadingMore.set(true);
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
            dependencia: apoyo.dependencia,
            localidad: apoyo.nombre_localidad,
            calle: apoyo.calle,
            numeroExterior: apoyo.numero_exterior,
            cantidad: apoyo.cantidad,
            conceptoApoyo: apoyo.nombre_concepto,
            programa: apoyo.programa,
            monto: apoyo.monto,
            fechaApoyo: apoyo.fecha_apoyo
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
          this.loadingMore.set(false);
        },
        error: (error) => {
          console.error('Error al cargar apoyos otorgados:', error);
          this.loading.set(false);
          this.loadingMore.set(false);
          this.errorMessage.set('No se pudieron cargar los apoyos otorgados. Intenta de nuevo.');
        }
      });
  }

  private cargarPendientes(reset: boolean = false): void {
    if (reset) {
      this.loading.set(true);
      this.offsetPendientes = 0;
    } else {
      this.loadingMore.set(true);
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
            dependencia: apoyo.dependencia,
            conceptoApoyo: apoyo.nombre_concepto,
            programa: apoyo.programa
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
          this.loadingMore.set(false);
        },
        error: (error) => {
          console.error('Error al cargar apoyos pendientes:', error);
          this.loading.set(false);
          this.loadingMore.set(false);
          this.errorMessage.set('No se pudieron cargar los apoyos pendientes. Intenta de nuevo.');
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
    // Al cambiar de pestaña, aplicar filtro de dependencia localmente
    this.aplicarFiltroDependencia();
  }

  filtrarPorCurp(): void {
    // Reiniciar y recargar con filtro de CURP desde el backend
    this.cargarInicial();
  }

  filtrarPorDependencia(): void {
    // Aplicar filtro de dependencia localmente (sin recargar del backend)
    this.aplicarFiltroDependencia();
  }

  private aplicarFiltroDependencia(): void {
    const dependenciaBuscada = this.filtroDependencia().trim();
    
    if (this.tabActivo() === 'otorgados') {
      if (!dependenciaBuscada) {
        // Si no hay filtro, recargar todos los datos
        this.cargarOtorgados(true);
        return;
      }
      
      // Filtrar localmente de los datos ya cargados
      const filtrados = this.apoyosOtorgados().filter(apoyo => 
        apoyo.dependencia === dependenciaBuscada
      );
      this.apoyosOtorgados.set(filtrados);
    } else {
      if (!dependenciaBuscada) {
        this.cargarPendientes(true);
        return;
      }
      
      const filtrados = this.apoyosPendientes().filter(apoyo => 
        apoyo.dependencia === dependenciaBuscada
      );
      this.apoyosPendientes.set(filtrados);
    }
  }

  cargarMas(): void {
    if (this.loadingMore()) return;

    if (this.tabActivo() === 'otorgados') {
      if (!this.hasMoreOtorgados()) return;
      this.cargarOtorgados(false);
    } else {
      if (!this.hasMorePendientes()) return;
      this.cargarPendientes(false);
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
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
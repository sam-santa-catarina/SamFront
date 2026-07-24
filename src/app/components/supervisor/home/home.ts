import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';
import {
  ApoyosService,
  ApoyoOtorgadoResponse,
  ApoyoPendienteResponse,
  ApoyosListResponse,
  ApoyosPendientesListResponse
} from '../../../services/apoyo';
import { DependenciasService, Dependencia } from '../../../services/dependencias';

const LIMITE = 30;
const DEBOUNCE_FILTROS_MS = 350;

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
  fechaCarga: string;
}

interface ApoyoPendiente {
  nombreCompleto: string;
  curp: string;
  dependencia: string;
  conceptoApoyo: string;
  programa: string;
  fechaCarga: string;
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
  readonly filtroDependencia = signal<number | ''>('');
  readonly filtroCalle = signal('');
  readonly filtroNumeroExterior = signal('');

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

  // Se emite cada vez que el usuario cambia un filtro (CURP, dependencia,
  // calle o número exterior). El debounceTime evita mandar una petición
  // por cada tecla que escribe.
  private readonly filtroChange$ = new Subject<void>();

  // Disparadores reales de las peticiones HTTP. Cada uno emite `true`
  // para reiniciar la búsqueda (offset 0) o `false` para "cargar más".
  // Al usar switchMap sobre estos Subjects, cualquier petición anterior
  // que siga en vuelo se cancela en cuanto llega un nuevo disparo — así
  // nunca puede llegar tarde una respuesta vieja y pisar el resultado
  // más reciente, sin importar qué tan rápido escriba el usuario.
  private readonly triggerOtorgados$ = new Subject<boolean>();
  private readonly triggerPendientes$ = new Subject<boolean>();

  ngOnInit(): void {
    this.cargarDependencias();
    this.configurarBusquedaOtorgados();
    this.configurarBusquedaPendientes();
    this.configurarDebounceFiltros();

    // Carga inicial, sin esperar el debounce
    this.triggerOtorgados$.next(true);
    this.triggerPendientes$.next(true);
  }

  private configurarDebounceFiltros(): void {
    this.filtroChange$
      .pipe(debounceTime(DEBOUNCE_FILTROS_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.triggerOtorgados$.next(true);
        this.triggerPendientes$.next(true);
      });
  }

  private configurarBusquedaOtorgados(): void {
    this.triggerOtorgados$
      .pipe(
        switchMap((reset) => {
          if (reset) this.offsetOtorgados = 0;
          this.loading.set(reset);
          this.loadingMore.set(!reset);
          this.errorMessage.set(null);

          const params = this.buildParamsOtorgados(reset);

          return this.apoyosService.listarApoyosSupervisor(params).pipe(
            map((response) => ({ response, reset })),
            catchError(() => {
              console.error('Error al cargar apoyos otorgados');
              return of({ response: null as ApoyosListResponse | null, reset });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ response, reset }) => {
        this.loading.set(false);
        this.loadingMore.set(false);

        if (!response) {
          this.errorMessage.set('No se pudieron cargar los apoyos otorgados. Intenta de nuevo.');
          return;
        }

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
          fechaApoyo: apoyo.fecha_apoyo,
          fechaCarga: apoyo.created_at
        }));

        this.apoyosOtorgados.set(reset ? nuevos : [...this.apoyosOtorgados(), ...nuevos]);
        this.totalOtorgados.set(response.total);
        this.hasMoreOtorgados.set(response.hasMore);
        this.offsetOtorgados += nuevos.length;
      });
  }

  private configurarBusquedaPendientes(): void {
    this.triggerPendientes$
      .pipe(
        switchMap((reset) => {
          if (reset) this.offsetPendientes = 0;
          this.loading.set(reset);
          this.loadingMore.set(!reset);
          this.errorMessage.set(null);

          const params = this.buildParamsPendientes(reset);

          return this.apoyosService.listarApoyosPendientesSupervisor(params).pipe(
            map((response) => ({ response, reset })),
            catchError(() => {
              console.error('Error al cargar apoyos pendientes');
              return of({ response: null as ApoyosPendientesListResponse | null, reset });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ response, reset }) => {
        this.loading.set(false);
        this.loadingMore.set(false);

        if (!response) {
          this.errorMessage.set('No se pudieron cargar los apoyos pendientes. Intenta de nuevo.');
          return;
        }

        const nuevos = response.data.map((apoyo: ApoyoPendienteResponse) => ({
          nombreCompleto: apoyo.nombre_completo,
          curp: apoyo.curp_beneficiario,
          dependencia: apoyo.dependencia,
          conceptoApoyo: apoyo.nombre_concepto,
          programa: apoyo.programa,
          fechaCarga: apoyo.created_at
        }));

        this.apoyosPendientes.set(reset ? nuevos : [...this.apoyosPendientes(), ...nuevos]);
        this.totalPendientes.set(response.total);
        this.hasMorePendientes.set(response.hasMore);
        this.offsetPendientes += nuevos.length;
      });
  }

  private buildParamsOtorgados(reset: boolean) {
    const params: any = { limit: LIMITE, offset: reset ? 0 : this.offsetOtorgados };

    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    if (curpBuscado && curpBuscado.length >= 4) params.curp = curpBuscado;

    const dependenciaBuscada = this.filtroDependencia();
    if (dependenciaBuscada !== '') params.id_dependencia = dependenciaBuscada;

    const calleBuscada = this.filtroCalle().trim();
    if (calleBuscada) params.calle = calleBuscada;

    const numeroBuscado = this.filtroNumeroExterior().trim();
    if (numeroBuscado) params.numero_exterior = numeroBuscado;

    return params;
  }

  private buildParamsPendientes(reset: boolean) {
    const params: any = { limit: LIMITE, offset: reset ? 0 : this.offsetPendientes };

    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    if (curpBuscado && curpBuscado.length >= 4) params.curp = curpBuscado;

    const dependenciaBuscada = this.filtroDependencia();
    if (dependenciaBuscada !== '') params.id_dependencia = dependenciaBuscada;

    // Calle y número exterior no aplican a pendientes: en ese estado
    // esos campos todavía no se han capturado.

    return params;
  }

  private cargarDependencias(): void {
    this.dependenciasService.listarDependencias().subscribe({
      next: (deps) => this.dependencias.set(deps),
      error: (error) => console.error('Error al cargar dependencias:', error)
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
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/iniciar-sesion'));
  }

  cambiarTab(tab: TipoCarga): void {
    this.tabActivo.set(tab);
  }

  filtrarPorCurp(): void {
    this.filtroChange$.next();
  }

  filtrarPorDependencia(): void {
    this.filtroChange$.next();
  }

  filtrarPorCalle(): void {
    this.filtroChange$.next();
  }

  filtrarPorNumeroExterior(): void {
    this.filtroChange$.next();
  }

  cargarMas(): void {
    if (this.loadingMore()) return;

    if (this.tabActivo() === 'otorgados') {
      if (!this.hasMoreOtorgados()) return;
      this.triggerOtorgados$.next(false);
    } else {
      if (!this.hasMorePendientes()) return;
      this.triggerPendientes$.next(false);
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
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
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
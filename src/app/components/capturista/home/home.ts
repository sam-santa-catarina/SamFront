import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';

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
}

interface ApoyoPendiente {
  nombreCompleto: string;
  curp: string;
  conceptoApoyo: string;
  programa: string;
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

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly tabActivo = signal<TipoCarga>('otorgados');
  readonly filtroCurp = signal('');

  // Datos completos sin filtrar
  private todosApoyosOtorgados: ApoyoOtorgado[] = [];
  private todosApoyosPendientes: ApoyoPendiente[] = [];

  // Datos filtrados que se muestran en la tabla
  readonly apoyosOtorgados = signal<ApoyoOtorgado[]>([]);
  readonly apoyosPendientes = signal<ApoyoPendiente[]>([]);

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    // TODO: Reemplazar con llamadas reales al backend
    // Ejemplo de datos de prueba para apoyos otorgados
    this.todosApoyosOtorgados = [
      {
        nombreCompleto: 'María Guadalupe',
        curp: 'TOLM900101MDFRPR05',
        localidad: 'Santa Catarina',
        calle: 'Hidalgo',
        numeroExterior: '123',
        cantidad: 5,
        conceptoApoyo: 'Borregas',
        programa: 'Fomento Ganadero',
        monto: 15000,
        fechaApoyo: '2024-03-15'
      },
      {
        nombreCompleto: 'José Antonio',
        curp: 'RACJ850612HDFMRS02',
        localidad: 'Santa Catarina',
        calle: 'Morelos',
        numeroExterior: '456',
        cantidad: 1,
        conceptoApoyo: 'Calentador solar',
        programa: 'Vivienda Digna',
        monto: 8500,
        fechaApoyo: '2024-02-28'
      },
      {
        nombreCompleto: 'Ana Karen',
        curp: 'HEPA930309MDFRRN08',
        localidad: 'Santa Catarina',
        calle: 'Juárez',
        numeroExterior: '789',
        cantidad: 2,
        conceptoApoyo: 'Tinacos para ganado',
        programa: 'Infraestructura Rural',
        monto: 12000,
        fechaApoyo: '2024-04-01'
      }
    ];

    // Ejemplo de datos de prueba para apoyos registrados
    this.todosApoyosPendientes = [
      {
        nombreCompleto: 'Torres',
        curp: 'TOLM900101MDFRPR05',
        conceptoApoyo: 'Semillas mejoradas',
        programa: 'Apoyo Agrícola'
      },
      {
        nombreCompleto: 'Ramírez',
        curp: 'RACJ850612HDFMRS02',
        conceptoApoyo: 'Despensa',
        programa: 'Seguridad Alimentaria'
      },
      {
        nombreCompleto: 'Hernández',
        curp: 'HEPA930309MDFRRN08',
        conceptoApoyo: 'Fertilizante',
        programa: 'Apoyo Agrícola'
      }
    ];

    // Inicializar las listas filtradas con todos los datos
    this.apoyosOtorgados.set([...this.todosApoyosOtorgados]);
    this.apoyosPendientes.set([...this.todosApoyosPendientes]);
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
    // Aplicar el filtro actual al cambiar de pestaña
    this.filtrarPorCurp();
  }

  descargarPlantilla(tab: TipoCarga): void {
    const nombreArchivo =
      tab === 'otorgados' ? 'plantilla-apoyos-otorgados.xlsx' : 'plantilla-apoyos-pendientes.xlsx';

    // TODO: reemplazar por la ruta real una vez que la plantilla exista en assets/plantillas
    const link = document.createElement('a');
    link.href = `/assets/plantillas/${nombreArchivo}`;
    link.download = nombreArchivo;
    link.click();
  }

  filtrarPorCurp(): void {
    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    
    if (!curpBuscado) {
      // Si no hay filtro, mostrar todos los datos
      this.apoyosOtorgados.set([...this.todosApoyosOtorgados]);
      this.apoyosPendientes.set([...this.todosApoyosPendientes]);
      return;
    }

    // Filtrar apoyos otorgados por CURP
    const otorgadosFiltrados = this.todosApoyosOtorgados.filter(apoyo => 
      apoyo.curp.includes(curpBuscado)
    );
    
    // Filtrar apoyos registrados por CURP
    const pendientesFiltrados = this.todosApoyosPendientes.filter(apoyo => 
      apoyo.curp.includes(curpBuscado)
    );

    this.apoyosOtorgados.set(otorgadosFiltrados);
    this.apoyosPendientes.set(pendientesFiltrados);
  }

  // Método para recargar datos desde el backend (útil para actualizaciones)
  recargarDatos(): void {
    // TODO: Implementar llamada al servicio del backend
    this.cargarDatos();
    this.filtrarPorCurp();
  }

  // Método helper para formatear montos
  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  // Método helper para formatear fechas
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
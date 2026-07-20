import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../../services/auth';
import { Router, RouterLink } from '@angular/router';

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

  readonly currentUser = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly sidebarOpen = signal(false);

  readonly tabActivo = signal<TipoCarga>('otorgados');
  readonly filtroCurp = signal('');
  readonly filtroDependencia = signal('');

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
    // Datos de ejemplo para apoyos otorgados
    this.todosApoyosOtorgados = [
      // Desarrollo Económico
      {
        nombreCompleto: 'María Guadalupe Torres López',
        curp: 'TOLM900101MDFRPR05',
        dependencia: 'Desarrollo Economico',
        localidad: 'Santa Catarina',
        calle: 'Hidalgo',
        numeroExterior: '123',
        cantidad: 1,
        conceptoApoyo: 'Equipo de cómputo',
        programa: 'Impulso Empresarial',
        monto: 25000,
        fechaApoyo: '2024-01-15'
      },
      {
        nombreCompleto: 'José Antonio Ramírez Cruz',
        curp: 'RACJ850612HDFMRS02',
        dependencia: 'Desarrollo Economico',
        localidad: 'Santa Catarina',
        calle: 'Morelos',
        numeroExterior: '456',
        cantidad: 1,
        conceptoApoyo: 'Mobiliario para negocio',
        programa: 'Impulso Empresarial',
        monto: 18000,
        fechaApoyo: '2024-01-20'
      },
      {
        nombreCompleto: 'Ana Karen Hernández Pérez',
        curp: 'HEPA930309MDFRRN08',
        dependencia: 'Desarrollo Economico',
        localidad: 'Santa Catarina',
        calle: 'Juárez',
        numeroExterior: '789',
        cantidad: 1,
        conceptoApoyo: 'Capacitación empresarial',
        programa: 'Capacitación para el Trabajo',
        monto: 5000,
        fechaApoyo: '2024-02-05'
      },
      {
        nombreCompleto: 'Carlos Mendoza García',
        curp: 'MEGC880215HDFNRR09',
        dependencia: 'Desarrollo Economico',
        localidad: 'Santa Catarina',
        calle: 'Zaragoza',
        numeroExterior: '321',
        cantidad: 1,
        conceptoApoyo: 'Insumos para panadería',
        programa: 'Impulso Empresarial',
        monto: 12000,
        fechaApoyo: '2024-02-18'
      },
      // Desarrollo Rural
      {
        nombreCompleto: 'Rosa Elena Sánchez Martínez',
        curp: 'SAMR950512MDFNRS03',
        dependencia: 'Desarrollo Rural',
        localidad: 'Santa Catarina',
        calle: 'Reforma',
        numeroExterior: '567',
        cantidad: 5,
        conceptoApoyo: 'Borregas',
        programa: 'Fomento Ganadero',
        monto: 15000,
        fechaApoyo: '2024-03-15'
      },
      {
        nombreCompleto: 'Juan Carlos Hernández Díaz',
        curp: 'HEDJ820715HDFRRN04',
        dependencia: 'Desarrollo Rural',
        localidad: 'Santa Catarina',
        calle: 'Independencia',
        numeroExterior: '890',
        cantidad: 2,
        conceptoApoyo: 'Tinacos para ganado',
        programa: 'Infraestructura Rural',
        monto: 12000,
        fechaApoyo: '2024-03-20'
      },
      {
        nombreCompleto: 'Patricia López García',
        curp: 'LOGP880321MDFRRT06',
        dependencia: 'Desarrollo Rural',
        localidad: 'Santa Catarina',
        calle: 'Guerrero',
        numeroExterior: '234',
        cantidad: 10,
        conceptoApoyo: 'Semillas de maíz',
        programa: 'Apoyo Agrícola',
        monto: 8000,
        fechaApoyo: '2024-04-01'
      },
      {
        nombreCompleto: 'Miguel Ángel Torres Ruiz',
        curp: 'TORR910828HDFRZG08',
        dependencia: 'Desarrollo Rural',
        localidad: 'Santa Catarina',
        calle: 'Madero',
        numeroExterior: '654',
        cantidad: 1,
        conceptoApoyo: 'Sistema de riego',
        programa: 'Infraestructura Rural',
        monto: 35000,
        fechaApoyo: '2024-04-10'
      },
      // Desarrollo Social
      {
        nombreCompleto: 'Laura Patricia Vázquez Luna',
        curp: 'VALL891106MDFZNR01',
        dependencia: 'Desarrollo Social',
        localidad: 'Santa Catarina',
        calle: 'Allende',
        numeroExterior: '432',
        cantidad: 1,
        conceptoApoyo: 'Calentador solar',
        programa: 'Vivienda Digna',
        monto: 8500,
        fechaApoyo: '2024-02-28'
      },
      {
        nombreCompleto: 'Francisco Javier Medina Soto',
        curp: 'MESF830425HDFNTR02',
        dependencia: 'Desarrollo Social',
        localidad: 'Santa Catarina',
        calle: 'Matamoros',
        numeroExterior: '765',
        cantidad: 1,
        conceptoApoyo: 'Láminas para techo',
        programa: 'Vivienda Digna',
        monto: 10000,
        fechaApoyo: '2024-03-05'
      },
      {
        nombreCompleto: 'Gabriela Hernández Morales',
        curp: 'HEMG940718MDFRRB03',
        dependencia: 'Desarrollo Social',
        localidad: 'Santa Catarina',
        calle: 'Victoria',
        numeroExterior: '198',
        cantidad: 1,
        conceptoApoyo: 'Piso firme',
        programa: 'Vivienda Digna',
        monto: 15000,
        fechaApoyo: '2024-03-18'
      },
      {
        nombreCompleto: 'Roberto Carlos Díaz Flores',
        curp: 'DIFR861202HDFZLR05',
        dependencia: 'Desarrollo Social',
        localidad: 'Santa Catarina',
        calle: 'Álvaro Obregón',
        numeroExterior: '543',
        cantidad: 3,
        conceptoApoyo: 'Despensa mensual',
        programa: 'Seguridad Alimentaria',
        monto: 4500,
        fechaApoyo: '2024-04-22'
      },
      // Despacho
      {
        nombreCompleto: 'Fernando Alberto Ruiz Gómez',
        curp: 'RUGF921114HDFZMR06',
        dependencia: 'Despacho',
        localidad: 'Santa Catarina',
        calle: 'Benito Juárez',
        numeroExterior: '876',
        cantidad: 1,
        conceptoApoyo: 'Gestión de escrituras',
        programa: 'Regularización de Predios',
        monto: 3000,
        fechaApoyo: '2024-05-10'
      },
      {
        nombreCompleto: 'Adriana Morales Castillo',
        curp: 'MOCA900306MDFRSD07',
        dependencia: 'Despacho',
        localidad: 'Santa Catarina',
        calle: '5 de Mayo',
        numeroExterior: '321',
        cantidad: 1,
        conceptoApoyo: 'Asesoría jurídica',
        programa: 'Asistencia Legal',
        monto: 2000,
        fechaApoyo: '2024-05-15'
      },
      {
        nombreCompleto: 'Eduardo Sánchez Pérez',
        curp: 'SAPE850810HDFNRL08',
        dependencia: 'Despacho',
        localidad: 'Santa Catarina',
        calle: 'Nicolás Bravo',
        numeroExterior: '654',
        cantidad: 1,
        conceptoApoyo: 'Trámite de testamento',
        programa: 'Asistencia Legal',
        monto: 1500,
        fechaApoyo: '2024-06-01'
      },
      {
        nombreCompleto: 'Martha Patricia Luna Vega',
        curp: 'LUVM870525MDFNGR09',
        dependencia: 'Despacho',
        localidad: 'Santa Catarina',
        calle: 'Melchor Ocampo',
        numeroExterior: '987',
        cantidad: 1,
        conceptoApoyo: 'Mediación comunitaria',
        programa: 'Asistencia Legal',
        monto: 1000,
        fechaApoyo: '2024-06-10'
      }
    ];

    // Datos de ejemplo para apoyos pendientes
    this.todosApoyosPendientes = [
      // Desarrollo Económico
      {
        nombreCompleto: 'Alejandro Flores Miranda',
        curp: 'FOMA950210HDFLRR10',
        dependencia: 'Desarrollo Economico',
        conceptoApoyo: 'Equipo de soldadura',
        programa: 'Impulso Empresarial'
      },
      {
        nombreCompleto: 'Diana Laura Castillo Romero',
        curp: 'CARD920815MDFSMN11',
        dependencia: 'Desarrollo Economico',
        conceptoApoyo: 'Máquina de coser industrial',
        programa: 'Impulso Empresarial'
      },
      {
        nombreCompleto: 'Ricardo Gómez Hernández',
        curp: 'GOHR880712HDFMRC12',
        dependencia: 'Desarrollo Economico',
        conceptoApoyo: 'Horno para pizzas',
        programa: 'Impulso Empresarial'
      },
      // Desarrollo Rural
      {
        nombreCompleto: 'María Elena Vázquez Torres',
        curp: 'VATM910304MDFZRR13',
        dependencia: 'Desarrollo Rural',
        conceptoApoyo: 'Semillas mejoradas de frijol',
        programa: 'Apoyo Agrícola'
      },
      {
        nombreCompleto: 'José Luis Hernández Ruiz',
        curp: 'HERL870506HDFZNS14',
        dependencia: 'Desarrollo Rural',
        conceptoApoyo: 'Pollos de engorda',
        programa: 'Fomento Avícola'
      },
      {
        nombreCompleto: 'Teresa de Jesús Morales Luna',
        curp: 'MOLT890815MDFRNS15',
        dependencia: 'Desarrollo Rural',
        conceptoApoyo: 'Fertilizante orgánico',
        programa: 'Apoyo Agrícola'
      },
      // Desarrollo Social
      {
        nombreCompleto: 'Gerardo Sánchez Mendoza',
        curp: 'SAMG850520HDFNNR16',
        dependencia: 'Desarrollo Social',
        conceptoApoyo: 'Cuarto adicional',
        programa: 'Vivienda Digna'
      },
      {
        nombreCompleto: 'Lucía Fernández García',
        curp: 'FEGL910114MDFRRC17',
        dependencia: 'Desarrollo Social',
        conceptoApoyo: 'Despensa básica',
        programa: 'Seguridad Alimentaria'
      },
      {
        nombreCompleto: 'Armando Díaz Rodríguez',
        curp: 'DIRA900828HDFZRM18',
        dependencia: 'Desarrollo Social',
        conceptoApoyo: 'Calentador solar',
        programa: 'Vivienda Digna'
      },
      // Despacho
      {
        nombreCompleto: 'Claudia Patricia Ramírez Soto',
        curp: 'RASC921003MDFMTL19',
        dependencia: 'Despacho',
        conceptoApoyo: 'Elaboración de testamento',
        programa: 'Asistencia Legal'
      },
      {
        nombreCompleto: 'Héctor Manuel Díaz Torres',
        curp: 'DITH861205HDFZRR20',
        dependencia: 'Despacho',
        conceptoApoyo: 'Regularización de escrituras',
        programa: 'Regularización de Predios'
      },
      {
        nombreCompleto: 'Sofía Arellano Martínez',
        curp: 'AEMS930215MDFRTF21',
        dependencia: 'Despacho',
        conceptoApoyo: 'Asesoría legal familiar',
        programa: 'Asistencia Legal'
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
    // Aplicar los filtros actuales al cambiar de pestaña
    this.aplicarFiltros();
  }

  filtrarPorCurp(): void {
    this.aplicarFiltros();
  }

  filtrarPorDependencia(): void {
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const curpBuscado = this.filtroCurp().trim().toUpperCase();
    const dependenciaBuscada = this.filtroDependencia().trim();
    
    // Filtrar apoyos otorgados
    let otorgadosFiltrados = [...this.todosApoyosOtorgados];
    
    if (curpBuscado) {
      otorgadosFiltrados = otorgadosFiltrados.filter(apoyo => 
        apoyo.curp.includes(curpBuscado)
      );
    }
    
    if (dependenciaBuscada) {
      otorgadosFiltrados = otorgadosFiltrados.filter(apoyo => 
        apoyo.dependencia === dependenciaBuscada
      );
    }
    
    // Filtrar apoyos pendientes
    let pendientesFiltrados = [...this.todosApoyosPendientes];
    
    if (curpBuscado) {
      pendientesFiltrados = pendientesFiltrados.filter(apoyo => 
        apoyo.curp.includes(curpBuscado)
      );
    }
    
    if (dependenciaBuscada) {
      pendientesFiltrados = pendientesFiltrados.filter(apoyo => 
        apoyo.dependencia === dependenciaBuscada
      );
    }

    this.apoyosOtorgados.set(otorgadosFiltrados);
    this.apoyosPendientes.set(pendientesFiltrados);
  }

  // Método para recargar datos desde el backend
  recargarDatos(): void {
    // TODO: Implementar llamada al servicio del backend
    this.cargarDatos();
    this.aplicarFiltros();
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
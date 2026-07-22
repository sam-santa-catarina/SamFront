import { Component, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import { Auth } from '../../../services/auth';
import { ApoyosService, ImportResultado } from '../../../services/apoyo';

type TabApoyo = 'otorgados' | 'registrados';

interface FilaPreview {
  nombre: string;
  curp: string;
  dependencia: string;
  programa: string;
  concepto: string;
  // Solo aplican para 'otorgados'
  localidad?: string;
  calle?: string;
  numeroExterior?: string;
  cantidad?: string;
  monto?: string;
  fecha?: string;
}

interface EstadoCarga {
  archivo: File | null;
  filas: FilaPreview[];
  filasMostrando: number; // cuántas filas se renderizan en la tabla (paginado "mostrar más")
  cargando: boolean;
  error: string | null;
}

const PAGE_SIZE = 10;

function estadoVacio(): EstadoCarga {
  return { archivo: null, filas: [], filasMostrando: PAGE_SIZE, cargando: false, error: null };
}

interface Notificacion {
  tipo: 'exito' | 'error';
  titulo: string;
  detalle?: string;
}

const DURACION_NOTIFICACION_MS = 8000;

// Fila 4 en Excel (índice 3) es donde el backend espera los encabezados,
// tanto para otorgados como para pendientes.
const HEADER_ROW_INDEX = 3;

// Columnas que deben existir siempre, sin importar el tipo de carga.
const COLUMNAS_BASE = ['NOMBRE(S)', 'CURP', 'DEPENDENCIA', 'PROGRAMA', 'CONCEPTO DE APOYO'];

// Columnas exclusivas del Excel de "otorgados". Si un archivo de
// pendientes no las trae (y no debería), sirven para distinguir uno de otro.
const COLUMNAS_SOLO_OTORGADOS = ['LOCALIDAD', 'CALLE', 'NÚMERO EXTERIOR', 'CANTIDAD', 'MONTO', 'FECHA DE APOYO'];

// Rutas estáticas servidas desde public/assets/plantillas/
const RUTA_PLANTILLA_OTORGADOS = '/assets/plantillas/plantilla-apoyos-otorgados.xlsx';
const RUTA_PLANTILLA_PENDIENTES = '/assets/plantillas/plantilla-apoyos-pendientes.xlsx';

@Component({
  selector: 'app-carga',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carga.html'
})
export class CargaApoyos {
  private readonly auth = inject(Auth);
  private readonly apoyosService = inject(ApoyosService);

  readonly sidebarOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly currentUser = this.auth.currentUser;

  readonly tabActivo = signal<TabApoyo>('otorgados');

  readonly estadoOtorgados = signal<EstadoCarga>(estadoVacio());
  readonly estadoRegistrados = signal<EstadoCarga>(estadoVacio());

  // Tab para el que se está mostrando el modal de "¿seguro que quieres cargar?".
  // null = no hay modal abierto.
  readonly confirmando = signal<TabApoyo | null>(null);

  // Toast de resultado (reemplaza los alert() nativos del navegador).
  readonly notificacion = signal<Notificacion | null>(null);
  private notificacionTimeout: ReturnType<typeof setTimeout> | null = null;

  // --- Layout (sidebar / menú de usuario) ---

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
    this.auth.logout().subscribe();
  }

  // --- Tabs ---

  cambiarTab(tab: TabApoyo): void {
    this.tabActivo.set(tab);
  }

  estadoDe(tab: TabApoyo): WritableSignal<EstadoCarga> {
    return tab === 'otorgados' ? this.estadoOtorgados : this.estadoRegistrados;
  }

  tituloDe(tab: TabApoyo): string {
    return tab === 'otorgados' ? 'Apoyos otorgados' : 'Apoyos pendientes';
  }

  descripcionDe(tab: TabApoyo): string {
    return tab === 'otorgados'
      ? 'Carga los apoyos ya entregados, con todos sus datos completos.'
      : 'Carga los apoyos pendientes por entregar, con los datos básicos del beneficiario.';
  }

  // --- Previa paginada (solo se renderizan filasMostrando filas en el DOM) ---

  filasVisibles(tab: TabApoyo): FilaPreview[] {
    const estado = this.estadoDe(tab)();
    return estado.filas.slice(0, estado.filasMostrando);
  }

  mostrarMas(tab: TabApoyo): void {
    this.estadoDe(tab).update((actual) => ({ ...actual, filasMostrando: actual.filasMostrando + PAGE_SIZE }));
  }

  // --- Selección y previa del archivo ---

  async onArchivoSeleccionado(tab: TabApoyo, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = ''; // permite volver a seleccionar el mismo archivo si se quita y se agrega de nuevo

    if (!archivo) return;

    const estado = this.estadoDe(tab);
    estado.set({ archivo, filas: [], filasMostrando: PAGE_SIZE, cargando: false, error: null });

    try {
      const filas = await this.leerPreviaExcel(tab, archivo);
      if (filas.length === 0) {
        estado.update((actual) => ({
          ...actual,
          error: 'No se encontraron filas de datos. Verifica que los encabezados estén en la fila 4 y los datos a partir de la fila 5.'
        }));
        return;
      }
      estado.update((actual) => ({ ...actual, filas }));
    } catch (err) {
      estado.update((actual) => ({
        ...actual,
        error: err instanceof Error
          ? err.message
          : 'No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls).'
      }));
    }
  }

  quitarArchivo(tab: TabApoyo): void {
    this.estadoDe(tab).set(estadoVacio());
  }

  // --- Confirmación y envío al backend ---

  aprobar(tab: TabApoyo): void {
    if (!this.estadoDe(tab)().archivo) return;
    this.confirmando.set(tab);
  }

  cancelarConfirmacion(): void {
    if (this.confirmando() && this.estadoDe(this.confirmando()!)().cargando) return;
    this.confirmando.set(null);
  }

  confirmarCarga(): void {
    const tab = this.confirmando();
    if (!tab) return;

    const estado = this.estadoDe(tab);
    const archivo = estado().archivo;
    if (!archivo) {
      this.confirmando.set(null);
      return;
    }

    estado.update((actual) => ({ ...actual, cargando: true, error: null }));

    const peticion$ = tab === 'otorgados'
      ? this.apoyosService.importarOtorgados(archivo)
      : this.apoyosService.importarPendientes(archivo);

    peticion$.subscribe({
      next: (resultado) => {
        estado.update((actual) => ({ ...actual, cargando: false }));
        this.confirmando.set(null);
        this.manejarResultado(tab, resultado);
      },
      error: (err: Error) => {
        estado.update((actual) => ({ ...actual, cargando: false, error: err.message }));
        this.confirmando.set(null);
      }
    });
  }

  private manejarResultado(tab: TabApoyo, resultado: ImportResultado): void {
    if (resultado.tipo === 'exito') {
      this.mostrarNotificacion({
        tipo: 'exito',
        titulo: 'Carga completada',
        detalle: resultado.mensaje
      });
      this.quitarArchivo(tab);
      return;
    }

    const resumen = resultado.resumen;
    const detalle = resumen
      ? `Insertados: ${resumen.insertados}` +
        (resumen.actualizados !== undefined ? `, actualizados: ${resumen.actualizados}` : '') +
        `, ignorados: ${resumen.ignorados}, con error: ${resumen.errores}.`
      : undefined;

    this.mostrarNotificacion({
      tipo: 'error',
      titulo: 'Hubo errores al cargar los registros, generando Excel...',
      detalle: `Se descargó "${resultado.archivoNombre}" con el detalle de cada fila.${detalle ? ' ' + detalle : ''}`
    });

    // Dejamos el archivo y la previa cargados por si quiere corregir y
    // volver a intentar, en vez de forzar a seleccionar el archivo de nuevo.
    this.estadoDe(tab).update((actual) => ({
      ...actual,
      error: 'Hubo filas con error. Revisa el archivo descargado, corrígelas y vuelve a subir el Excel.'
    }));
  }

  private mostrarNotificacion(notificacion: Notificacion): void {
    if (this.notificacionTimeout) {
      clearTimeout(this.notificacionTimeout);
    }
    this.notificacion.set(notificacion);
    this.notificacionTimeout = setTimeout(() => this.notificacion.set(null), DURACION_NOTIFICACION_MS);
  }

  cerrarNotificacion(): void {
    if (this.notificacionTimeout) {
      clearTimeout(this.notificacionTimeout);
      this.notificacionTimeout = null;
    }
    this.notificacion.set(null);
  }

  // --- Plantilla descargable (archivos estáticos en public/assets/plantillas/) ---

  descargarPlantilla(tab: TabApoyo): void {
    const ruta = tab === 'otorgados' ? RUTA_PLANTILLA_OTORGADOS : RUTA_PLANTILLA_PENDIENTES;
    const nombreArchivo = tab === 'otorgados'
      ? 'plantilla-apoyos-otorgados.xlsx'
      : 'plantilla-apoyos-pendientes.xlsx';

    const enlace = document.createElement('a');
    enlace.href = ruta;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  // --- Validación de encabezados (evita subir el Excel al revés) ---

  /**
   * Devuelve un mensaje de error si los encabezados no corresponden al
   * tipo de carga (tab), o null si el archivo parece correcto.
   *
   * - Siempre deben venir las columnas base (nombre, CURP, dependencia, etc).
   * - En 'otorgados' deben venir además las columnas exclusivas de otorgados
   *   (localidad, calle, cantidad, monto, fecha...). Si faltan, es muy
   *   probable que el usuario haya subido el Excel de pendientes.
   * - En 'registrados' (pendientes) NO deben venir esas columnas. Si vienen,
   *   es muy probable que el usuario haya subido el Excel de otorgados.
   */
  private validarEncabezados(tab: TabApoyo, encabezados: string[]): string | null {
    const faltanBase = COLUMNAS_BASE.filter((c) => !encabezados.includes(c));
    if (faltanBase.length > 0) {
      return `El Excel no tiene el formato esperado, faltan las columnas: ${faltanBase.join(', ')}.`;
    }

    if (tab === 'otorgados') {
      const faltanOtorgados = COLUMNAS_SOLO_OTORGADOS.filter((c) => !encabezados.includes(c));
      if (faltanOtorgados.length > 0) {
        return `Este archivo parece ser de apoyos pendientes, no de otorgados (le faltan columnas como "${faltanOtorgados[0]}"). Verifica que subiste el Excel correcto o cambia de pestaña.`;
      }
    } else {
      const tieneColumnasOtorgados = COLUMNAS_SOLO_OTORGADOS.some((c) => encabezados.includes(c));
      if (tieneColumnasOtorgados) {
        return `Este archivo parece ser de apoyos otorgados, no de pendientes. Verifica que subiste el Excel correcto o cambia de pestaña.`;
      }
    }

    return null;
  }

  // --- Lectura de la previa (solo informativa, la validación real la hace el backend) ---

  private leerPreviaExcel(tab: TabApoyo, archivo: File): Promise<FilaPreview[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        try {
          const datos = new Uint8Array(reader.result as ArrayBuffer);
          const libro = XLSX.read(datos, { type: 'array' });
          const nombreHoja = libro.SheetNames[0];
          if (!nombreHoja) {
            resolve([]);
            return;
          }

          const hoja = libro.Sheets[nombreHoja];
          const filas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' });

          if (filas.length <= HEADER_ROW_INDEX) {
            resolve([]);
            return;
          }

          const encabezados = (filas[HEADER_ROW_INDEX] as string[]).map((h) => String(h ?? '').trim().toUpperCase());

          const errorFormato = this.validarEncabezados(tab, encabezados);
          if (errorFormato) {
            reject(new Error(errorFormato));
            return;
          }

          const indiceDe = (nombre: string) => encabezados.indexOf(nombre);

          const iNombre = indiceDe('NOMBRE(S)');
          const iPaterno = indiceDe('APELLIDO PATERNO');
          const iMaterno = indiceDe('APELLIDO MATERNO');
          const iCurp = indiceDe('CURP');
          const iDependencia = indiceDe('DEPENDENCIA');
          const iPrograma = indiceDe('PROGRAMA');
          const iConcepto = indiceDe('CONCEPTO DE APOYO');
          const iLocalidad = indiceDe('LOCALIDAD');
          const iCalle = indiceDe('CALLE');
          const iNumExt = indiceDe('NÚMERO EXTERIOR');
          const iCantidad = indiceDe('CANTIDAD');
          const iMonto = indiceDe('MONTO');
          const iFecha = indiceDe('FECHA DE APOYO');

          const resultado: FilaPreview[] = [];

          for (let i = HEADER_ROW_INDEX + 1; i < filas.length; i++) {
            const fila = filas[i] as unknown[];
            if (!fila || fila.every((celda) => celda === undefined || celda === null || celda === '')) {
              continue;
            }

            const celda = (idx: number) => (idx >= 0 ? String(fila[idx] ?? '').trim() : '');

            const nombreCompleto = [celda(iNombre), celda(iPaterno), celda(iMaterno)]
              .filter(Boolean)
              .join(' ');

            const filaPreview: FilaPreview = {
              nombre: nombreCompleto || '(sin nombre)',
              curp: celda(iCurp),
              dependencia: celda(iDependencia),
              programa: celda(iPrograma),
              concepto: celda(iConcepto)
            };

            if (tab === 'otorgados') {
              filaPreview.localidad = celda(iLocalidad);
              filaPreview.calle = celda(iCalle);
              filaPreview.numeroExterior = celda(iNumExt);
              filaPreview.cantidad = celda(iCantidad);
              filaPreview.monto = celda(iMonto);
              filaPreview.fecha = celda(iFecha);
            }

            resultado.push(filaPreview);
          }

          resolve(resultado);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(archivo);
    });
  }
}
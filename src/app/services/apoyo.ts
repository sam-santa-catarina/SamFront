import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApoyoOtorgadoResponse {
  id_apoyo: number;
  curp_beneficiario: string;
  nombre_completo: string;
  nombre_localidad: string;
  calle: string;
  numero_exterior: string;
  dependencia: string;
  programa: string;
  nombre_concepto: string;
  cantidad: number;
  monto: number;
  fecha_apoyo: string;
  capturado_por: string;
  created_at: string;
}

export interface ApoyoPendienteResponse {
  id_apoyo: number;
  curp_beneficiario: string;
  nombre_completo: string;
  dependencia: string;
  programa: string;
  nombre_concepto: string;
  estatus: string;
  capturado_por: string;
  created_at: string;
}

export interface ApoyosListResponse {
  data: ApoyoOtorgadoResponse[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ApoyosPendientesListResponse {
  data: ApoyoPendienteResponse[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// --- Resultado de importar un Excel (otorgados, pendientes o actualización de montos) ---

export interface ResumenImportacion {
  insertados?: number;
  actualizados?: number;
  ignorados: number;
  errores: number;
  total_procesados: number;
}

export interface ImportResultadoExito {
  tipo: 'exito';
  mensaje: string;
  insertados?: number;
  actualizados?: number;
  ignorados?: number;
  total: number;
}

export interface ImportResultadoErrores {
  tipo: 'errores';
  archivoNombre: string;
  resumen: ResumenImportacion | null;
}

export type ImportResultado = ImportResultadoExito | ImportResultadoErrores;

@Injectable({ providedIn: 'root' })
export class ApoyosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/apoyos`;

  /**
   * GET /api/apoyos
   * Lista apoyos otorgados (otorgado = true)
   */
  listarApoyos(params?: {
    offset?: number;
    limit?: number;
    curp?: string;
  }): Observable<ApoyosListResponse> {
    let url = `${this.baseUrl}/`;
    const queryParams = new URLSearchParams();

    if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    if (params?.curp) queryParams.set('curp', params.curp);

    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    return this.http.get<ApoyosListResponse>(url, { withCredentials: true });
  }

  /**
   * GET /api/apoyos/pendientes
   * Lista apoyos pendientes (otorgado = false)
   */
  listarApoyosPendientes(params?: {
    offset?: number;
    limit?: number;
    curp?: string;
  }): Observable<ApoyosPendientesListResponse> {
    let url = `${this.baseUrl}/pendientes`;
    const queryParams = new URLSearchParams();

    if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    if (params?.curp) queryParams.set('curp', params.curp);

    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    return this.http.get<ApoyosPendientesListResponse>(url, { withCredentials: true });
  }

  /**
   * GET /api/apoyos/supervisor/otorgados
   * Exclusivo para Supervisor. Igual que listarApoyos, pero permite
   * filtrar también por dependencia, calle y número exterior
   * directamente en el backend.
   */
  listarApoyosSupervisor(params?: {
    offset?: number;
    limit?: number;
    curp?: string;
    id_dependencia?: number;
    calle?: string;
    numero_exterior?: string;
  }): Observable<ApoyosListResponse> {
    let url = `${this.baseUrl}/supervisor/otorgados`;
    const queryParams = new URLSearchParams();

    if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    if (params?.curp) queryParams.set('curp', params.curp);
    if (params?.id_dependencia !== undefined) queryParams.set('id_dependencia', params.id_dependencia.toString());
    if (params?.calle) queryParams.set('calle', params.calle);
    if (params?.numero_exterior) queryParams.set('numero_exterior', params.numero_exterior);

    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    return this.http.get<ApoyosListResponse>(url, { withCredentials: true });
  }

  /**
   * GET /api/apoyos/supervisor/pendientes
   * Exclusivo para Supervisor. Igual que listarApoyosPendientes, pero
   * permite filtrar también por dependencia directamente en el backend.
   */
  listarApoyosPendientesSupervisor(params?: {
    offset?: number;
    limit?: number;
    curp?: string;
    id_dependencia?: number;
  }): Observable<ApoyosPendientesListResponse> {
    let url = `${this.baseUrl}/supervisor/pendientes`;
    const queryParams = new URLSearchParams();

    if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
    if (params?.curp) queryParams.set('curp', params.curp);
    if (params?.id_dependencia !== undefined) queryParams.set('id_dependencia', params.id_dependencia.toString());

    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    return this.http.get<ApoyosPendientesListResponse>(url, { withCredentials: true });
  }

  /**
   * POST /api/apoyos/importar
   * Sube un Excel de apoyos OTORGADOS (datos completos).
   */
  importarOtorgados(file: File): Observable<ImportResultado> {
    return this.subirArchivo(`${this.baseUrl}/importar`, file);
  }

  /**
   * POST /api/apoyos/importar-pendientes
   * Sube un Excel de apoyos PENDIENTES (datos básicos).
   */
  importarPendientes(file: File): Observable<ImportResultado> {
    return this.subirArchivo(`${this.baseUrl}/importar-pendientes`, file);
  }

  /**
   * GET /api/apoyos/exportar-sin-monto
   * Descarga el Excel de apoyos otorgados sin monto registrado, listos
   * para llenarse y volver a subirse con actualizarMonto().
   *
   * Para Administrador hay que pasar id_dependencia. Para Capturista/
   * Dependencia se omite: el backend usa automáticamente su propia
   * dependencia.
   */
  exportarSinMonto(id_dependencia?: number): Observable<void> {
    let url = `${this.baseUrl}/exportar-sin-monto`;
    if (id_dependencia !== undefined) {
      url += `?id_dependencia=${id_dependencia}`;
    }

    return this.http
      .get(url, { withCredentials: true, observe: 'response', responseType: 'blob' })
      .pipe(
        map((response) => {
          const blob = response.body as Blob;
          const disposicion = response.headers.get('content-disposition') ?? '';
          const match = disposicion.match(/filename="?([^";]+)"?/i);
          const archivoNombre = match ? match[1] : 'apoyos-sin-monto.xlsx';
          this.descargarBlob(blob, archivoNombre);
        }),
        catchError((err: HttpErrorResponse) => this.procesarErrorBlob(err))
      );
  }

  /**
   * POST /api/apoyos/actualizar-monto
   * Sube el Excel generado por exportarSinMonto() (con ID_APOYO y MONTO
   * ya llenos) y actualiza únicamente el monto de cada registro indicado.
   */
  actualizarMonto(file: File): Observable<ImportResultado> {
    return this.subirArchivo(`${this.baseUrl}/actualizar-monto`, file);
  }

  // --- Internos ---

  /**
   * El backend responde de dos formas distintas para el mismo endpoint:
   * - JSON (200) cuando todas las filas se procesaron sin error.
   * - Un archivo .xlsx descargable (200) cuando hubo filas con error,
   *   con un header X-Import-Result con el resumen en JSON.
   * Pedimos la respuesta siempre como blob y decidimos cuál es cuál
   * revisando el Content-Type.
   */
  private subirArchivo(url: string, file: File): Observable<ImportResultado> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post(url, formData, {
        withCredentials: true,
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        switchMap((response) => this.procesarRespuesta(response)),
        catchError((err: HttpErrorResponse) => this.procesarErrorBlob(err))
      );
  }

  private procesarRespuesta(response: HttpResponse<Blob>): Observable<ImportResultado> {
    const contentType = response.headers.get('content-type') ?? '';
    const blob = response.body as Blob;

    if (contentType.includes('application/json')) {
      return from(blob.text()).pipe(
        map((texto) => {
          const cuerpo = JSON.parse(texto);
          const resultado: ImportResultadoExito = {
            tipo: 'exito',
            mensaje: cuerpo.message,
            insertados: cuerpo.insertados,
            actualizados: cuerpo.actualizados,
            ignorados: cuerpo.ignorados,
            total: cuerpo.total
          };
          return resultado;
        })
      );
    }

    // Es el Excel de errores
    const disposicion = response.headers.get('content-disposition') ?? '';
    const match = disposicion.match(/filename="?([^";]+)"?/i);
    const archivoNombre = match ? match[1] : 'errores_importacion.xlsx';

    const resumenHeader = response.headers.get('x-import-result');
    let resumen: ResumenImportacion | null = null;
    if (resumenHeader) {
      try {
        resumen = JSON.parse(resumenHeader);
      } catch {
        resumen = null;
      }
    }

    this.descargarBlob(blob, archivoNombre);

    const resultado: ImportResultadoErrores = { tipo: 'errores', archivoNombre, resumen };
    return of(resultado);
  }

  private procesarErrorBlob(err: HttpErrorResponse): Observable<never> {
    if (err.error instanceof Blob) {
      return from(err.error.text()).pipe(
        switchMap((texto) => {
          let mensaje = 'Ocurrió un error al procesar el archivo.';
          try {
            const cuerpo = JSON.parse(texto);
            mensaje = cuerpo.message || cuerpo.error || mensaje;
          } catch {
            // El cuerpo no era JSON, se deja el mensaje genérico
          }
          return throwError(() => new Error(mensaje));
        })
      );
    }
    return throwError(() => new Error(err.message || 'Ocurrió un error al procesar el archivo.'));
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  }
}
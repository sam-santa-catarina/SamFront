import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
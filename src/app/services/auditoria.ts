import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuditoriaResponse, AuditoriaFiltros } from '../models/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auditoria`;

  listar(offset: number, limit: number, filtros: AuditoriaFiltros): Observable<AuditoriaResponse> {
    let params = new HttpParams()
      .set('offset', offset)
      .set('limit', limit);

    if (filtros.id_usuario) {
      params = params.set('id_usuario', filtros.id_usuario);
    }
    if (filtros.correo_electronico) {
      params = params.set('correo_electronico', filtros.correo_electronico);
    }
    if (filtros.accion) {
      params = params.set('accion', filtros.accion);
    }

    return this.http.get<AuditoriaResponse>(this.baseUrl, { params, withCredentials: true });
  }
}
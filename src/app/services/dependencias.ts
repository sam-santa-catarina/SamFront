import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Dependencia {
  id_dependencia: number;
  nombre_dependencia: string;
  descripcion_dependencia?: string;
  estatus_dependencia: boolean;
}

interface DependenciasListResponse {
  data: Dependencia[];
}

@Injectable({ providedIn: 'root' })
export class DependenciasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/dependencias`;

  listarDependencias(): Observable<Dependencia[]> {
    return this.http
      .get<DependenciasListResponse>(`${this.baseUrl}/`, { withCredentials: true })
      .pipe(map((res) => res.data));
  }
}
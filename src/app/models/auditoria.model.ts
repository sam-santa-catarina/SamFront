export interface AuditoriaRegistro {
  id_auditoria: number;
  id_usuario: number | null;
  nombre_usuario: string | null;
  correo_electronico: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: number | null;
  detalles: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  fecha: string;
}

export interface AuditoriaResponse {
  data: AuditoriaRegistro[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface AuditoriaFiltros {
  id_usuario?: number | null;
  correo_electronico?: string | null;
  accion?: string | null;
}
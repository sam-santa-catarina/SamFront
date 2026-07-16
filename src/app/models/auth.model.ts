export interface LoginResponse {
  message: string;
  user: {
    id: number;
    nombre_usuario: string;
    correo_electronico: string;
    id_rol_usuario: number;
  };
  requiere_cambio_contrasena: boolean;
  tokens: {
    access_token: string;
    expires_in: string;
  };
}

export interface ApiErrorBody {
  message?: string;
  code?: string;
  bloqueado_hasta?: string;
  errors?: string[];
}

export interface RefreshResponse {
  message: string;
  user: LoginResponse['user'];
  requiere_cambio_contrasena: boolean;
  tokens: {
    access_token: string;
    expires_in: string;
  };
}

export interface UsuarioListado {
  id_usuario: number;
  nombre_usuario: string;
  correo_electronico: string;
  id_estatus_usuario: number;
}

export interface UsuariosResponse {
  data: UsuarioListado[];
}
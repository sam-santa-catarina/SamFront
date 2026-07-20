import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { HomeAdmin } from './components/admin/home/home';
import { HomeDependencia } from './components/capturista/home/home';
import { HomeSupervisor } from './components/supervisor/home/home';
import { authGuard } from './guards/auth.guard';
import { forcePasswordChangeGuard } from './guards/force-password-change.guard';
import { roleGuard } from './guards/role.guard';
import { ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR, ID_ROL_CAPTURISTA } from './constants/roles';
import { Usuarios } from './components/admin/usuarios/usuarios';
import { Auditoria } from './components/admin/auditoria/auditoria';
import { CargaApoyos } from './components/admin/carga/carga';

export const routes: Routes = [
  { path: '', redirectTo: 'iniciar-sesion', pathMatch: 'full' },
  { path: 'iniciar-sesion', component: Login, title: 'Iniciar sesión - SCSAM' },

  {
    path: 'administrador',
    canActivate: [authGuard, forcePasswordChangeGuard],
    canActivateChild: [authGuard, forcePasswordChangeGuard, roleGuard],
    data: { roles: [ID_ROL_ADMINISTRADOR] },
    children: [
      { path: 'inicio', component: HomeAdmin, title: 'Inicio - Administrador' },
      { path: 'carga', component: CargaApoyos, title: 'Carga de Apoyos - Administrador' },
      { path: 'usuarios', component: Usuarios, title: 'Usuarios - Administrador' },
      { path: 'auditoria', component: Auditoria, title: 'Auditoria - Administrador' }
    ],
  },

  {
    path: 'dependencia',
    canActivate: [authGuard, forcePasswordChangeGuard],
    canActivateChild: [authGuard, forcePasswordChangeGuard, roleGuard],
    data: { roles: [ID_ROL_CAPTURISTA] },
    children: [
      { path: 'inicio', component: HomeDependencia, title: 'Inicio - Dependencia' },
    ],
  },

  {
    path: 'supervisor',
    canActivate: [authGuard, forcePasswordChangeGuard],
    canActivateChild: [authGuard, forcePasswordChangeGuard, roleGuard],
    data: { roles: [ID_ROL_SUPERVISOR] },
    children: [
      { path: 'inicio', component: HomeSupervisor, title: 'Inicio - Supervisor' },
    ],
  },
];
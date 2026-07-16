import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { HomeAdmin } from './components/admin/home/home';
import { HomeCapturista } from './components/capturista/home/home';
import { HomeSupervisor } from './components/supervisor/home/home';
import { authGuard } from './guards/auth.guard';
import { forcePasswordChangeGuard } from './guards/force-password-change.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'iniciar-sesion', pathMatch: 'full' },
    { path: 'iniciar-sesion', component: Login, title: 'Iniciar sesión - SCSAM' },
    { path: 'administrador/inicio', component: HomeAdmin, title: 'Inicio - Administrador', canActivate: [authGuard, forcePasswordChangeGuard] },
    { path: 'capturista/inicio', component: HomeCapturista, title: 'Inicio - Capturista', canActivate: [authGuard, forcePasswordChangeGuard] },
    { path: 'supervisor/inicio', component: HomeSupervisor, title: 'Inicio - Supervisor', canActivate: [authGuard, forcePasswordChangeGuard] },
];  
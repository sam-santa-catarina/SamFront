import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { RecuperarContrasena } from './components/auth/recuperar-contrasena/recuperar-contrasena';

export const routes: Routes = [
    { path: '', redirectTo: 'iniciar-sesion', pathMatch: 'full' },
    { path: 'iniciar-sesion', component: Login },
    { path: 'recuperar-contrasena', component: RecuperarContrasena },
];
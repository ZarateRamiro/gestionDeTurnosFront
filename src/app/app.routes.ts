import { Routes } from '@angular/router';
import { roleGuard } from './core/auth.guard';

// loadComponent divide las pantallas en chunks y las descarga al navegar a cada ruta.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  { path: 'registro', loadComponent: () => import('./pages/registro/registro').then((m) => m.RegistroPage) },
  { path: 'turnos', canActivate: [roleGuard('CLIENTE')], loadComponent: () => import('./pages/cliente-turnos/cliente-turnos').then((m) => m.ClienteTurnosPage) },
  { path: '', canActivate: [roleGuard('ADMINISTRADOR')], loadComponent: () => import('./app').then((m) => m.App) },
  { path: '**', redirectTo: '' },
];

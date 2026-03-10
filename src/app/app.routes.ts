import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/auth/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
  },
  {
    path: 'driver/login',
    loadComponent: () => import('./features/auth/driver-login/driver-login.component').then(m => m.DriverLoginComponent),
  },
  {
    path: 'superadmin',
    canActivate: [authGuard, roleGuard(['superadmin'])],
    loadComponent: () => import('./features/superadmin/superadmin-dashboard/superadmin-dashboard').then(m => m.SuperadminDashboard),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard(['driver'])],
    loadComponent: () => import('./features/driver/driver-dashboard/driver-dashboard').then(m => m.DriverDashboard),
  },
  { path: '**', redirectTo: 'login' }
];

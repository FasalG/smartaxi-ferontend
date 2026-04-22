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
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'driver/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'superadmin',
    canActivate: [authGuard, roleGuard(['superadmin'])],
    loadComponent: () => import('./features/superadmin/superadmin-dashboard/superadmin-dashboard').then(m => m.SuperadminDashboard),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard) },
      { path: 'vehicles', loadComponent: () => import('./features/admin/vehicles/vehicles').then(m => m.VehiclesComponent) },
      { path: 'trips', loadComponent: () => import('./features/admin/trips/trips').then(m => m.TripsComponent) },
      { path: 'reports', loadComponent: () => import('./features/admin/reports/reports').then(m => m.ReportsComponent) },
      // { path: 'analytics', loadComponent: () => import('./features/admin/analytics/analytics').then(m => m.AnalyticsComponent) },
      { path: 'receivables', loadComponent: () => import('./features/admin/receivables/receivables').then(m => m.ReceivablesComponent) },
      { path: 'customers', loadComponent: () => import('./features/admin/customers/customers').then(m => m.CustomersComponent) },
      // { path: 'maintenance', loadComponent: () => import('./features/admin/maintenance/maintenance').then(m => m.MaintenanceComponent) },
      { path: 'drivers', loadComponent: () => import('./features/admin/drivers/drivers').then(m => m.DriversComponent) }
    ]
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard(['driver'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/driver/driver-dashboard/driver-dashboard').then(m => m.DriverDashboard) },
      { path: 'history', loadComponent: () => import('./features/driver/trip-history/trip-history').then(m => m.TripHistoryComponent) }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

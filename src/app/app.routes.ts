import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { BookingsComponent } from './components/bookings/bookings.component';
import { ExpensesComponent } from './components/expenses/expenses.component';
import { CustomersComponent } from './components/customers/customers.component';
import { MaintenanceComponent } from './components/maintenance/maintenance.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () => import('./components/inventory/inventory.component').then(m => m.InventoryComponent),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () => import('./components/categories/categories.component').then(m => m.CategoriesComponent),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./components/bookings/bookings.component').then(m => m.BookingsComponent),
  },
  {
    path: 'expenses',
    canActivate: [authGuard],
    loadComponent: () => import('./components/expenses/expenses.component').then(m => m.ExpensesComponent),
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () => import('./components/customers/customers.component').then(m => m.CustomersComponent),
  },
  {
    path: 'maintenance',
    canActivate: [authGuard],
    loadComponent: () => import('./components/maintenance/maintenance.component').then(m => m.MaintenanceComponent),
  },
  // {
  //   path: 'analytics',
  //   canActivate: [authGuard],
  //   loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent),
  // },
  {
    path: 'bank-details',
    canActivate: [authGuard],
    loadComponent: () => import('./components/bank-details/bank-details.component').then(m => m.BankDetailsComponent),
  },
  { path: '**', redirectTo: 'dashboard' }
];

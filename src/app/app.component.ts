import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent
  ],
  template: `
    <div class="d-flex overflow-hidden" style="height: 100vh;">
      <!-- Desktop Sidebar -->
      <app-sidebar *ngIf="authService.isAuthenticated()" class="h-100 d-none d-lg-block"></app-sidebar>

      <main class="flex-grow-1 overflow-auto d-flex flex-column" [style.background-color]="authService.isAuthenticated() ? 'var(--background)' : 'transparent'">
        <!-- Mobile Header -->
        <div *ngIf="authService.isAuthenticated()" class="d-lg-none d-flex justify-content-between align-items-center p-3 shadow-sm" style="background-color: var(--sidebar-primary); color: var(--sidebar-primary-foreground);">
          <div class="d-flex align-items-center gap-2">
            <h1 class="h5 mb-0 fw-bold">Rental ERP</h1>
          </div>
          <button class="btn btn-sm text-white" (click)="toggleSidebar()">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <!-- Mobile Sidebar Overlay -->
        <div *ngIf="authService.isAuthenticated() && isSidebarOpen" 
             class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
             style="z-index: 1040; transition: opacity 0.3s;"
             (click)="toggleSidebar()">
        </div>

        <!-- Mobile Offcanvas Sidebar -->
        <div *ngIf="authService.isAuthenticated()" class="position-fixed top-0 start-0 h-100 shadow mobile-sidebar" 
             [class.open]="isSidebarOpen"
             style="z-index: 1045; width: 280px; transform: translateX(-100%); transition: transform 0.3s ease-in-out;">
          <app-sidebar class="h-100 d-block" (menuClick)="closeSidebar()"></app-sidebar>
        </div>

        <!-- Main Content Area -->
        <div class="flex-grow-1" [class.container-fluid]="authService.isAuthenticated()" [class.py-4]="authService.isAuthenticated()" [class.p-md-5]="authService.isAuthenticated()">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .mobile-sidebar.open {
      transform: translateX(0) !important;
    }
  `]
})
export class AppComponent {
  title = 'zorta-erp';
  isSidebarOpen = false;
  authService = inject(AuthService);

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }
}


import { Component, EventEmitter, Output, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="d-flex flex-column h-100 sidebar-container" style="width: 220px; background-color: var(--sidebar-primary); color: var(--sidebar-primary-foreground);">
      <!-- Fixed Header -->
      <div class="sidebar-header p-3 border-bottom" style="border-color: rgba(255,255,255,0.1) !important;">
        <div class="overflow-hidden w-100">
          <h1 class="h5 fw-bold mb-0 text-truncate" [title]="authService.currentUser()?.companyDetails?.name || 'Rental ERP'">
            {{ authService.currentUser()?.companyDetails?.name || 'Rental ERP' }}
          </h1>
          <p class="smaller mb-0 opacity-75">Management System</p>
        </div>
      </div>

      <!-- Scrollable Menu Area -->
      <div class="flex-grow-1 overflow-y-auto overflow-x-hidden custom-scrollbar" style="min-height: 0;">
        <ul class="nav nav-pills flex-column mt-2 gap-1 px-2 py-2">
          <li *ngFor="let item of menuItems()" class="nav-item w-100">
            <a
              [routerLink]="['/' + item.route]"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{exact: true}"
              class="nav-link d-flex align-items-center gap-2 py-2 px-3 w-100 text-start border-0 rounded-3 transition-all sidebar-link"
              (click)="onMenuClick()"
            >
              <svg class="bi pe-none flex-shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path *ngIf="item.icon === 'LayoutDashboard'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                <path *ngIf="item.icon === 'Package'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                <path *ngIf="item.icon === 'ShoppingCart'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                <path *ngIf="item.icon === 'Calendar'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path *ngIf="item.icon === 'Receipt'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                <path *ngIf="item.icon === 'Users'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path *ngIf="item.icon === 'Wrench'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path *ngIf="item.icon === 'Car'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                <path *ngIf="item.icon === 'MapPin'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path *ngIf="item.icon === 'BarChart3'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                <path *ngIf="item.icon === 'Activity'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                <path *ngIf="item.icon === 'Bank'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18M3 10h18M5 10v11m14-11v11M9 10v11m6-11v11M12 3L2 10h20L12 3z" />
              </svg>
              <span class="text-truncate">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Fixed User Area -->
      <div class="sidebar-footer mt-auto p-3 border-top" style="border-color: rgba(255,255,255,0.1) !important;">
        <div class="d-flex align-items-center gap-2 mb-3">
          <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 40px; height: 40px; background-color: rgba(255,255,255,0.1);">
            <span class="smaller fw-bold">{{ getInitials() }}</span>
          </div>
          <div class="overflow-hidden">
            <p class="fw-semibold mb-0 text-truncate" style="font-size: 1.05rem;">{{ authService.currentUser()?.name || 'Administrator' }}</p>
            <p class="smaller mb-0 opacity-75 text-truncate" style="font-size: 0.85rem;">{{ authService.currentUser()?.email || 'admin@rental.com' }}</p>
          </div>
        </div>
        <button class="btn btn-sm w-100 d-flex justify-content-center align-items-center gap-2 border-0" style="background: rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 0.9rem;" (click)="onLogout()">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
    }
    .sidebar-header, .sidebar-footer {
      flex-shrink: 0;
    }
    .sidebar-link {
      color: rgba(255, 255, 255, 0.7) !important;
      font-weight: 500;
      transition: all 0.2s ease;
      font-size: 0.95rem;
    }
    .sidebar-link:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #ffffff !important;
    }
    .sidebar-link.active {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .smaller {
      font-size: 0.75rem;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    @media (max-width: 991.98px) {
      .sidebar-container {
        width: 100% !important;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  constructor() { }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user && user.role === 'driver') {
      this.authService.getMe().subscribe();
    }
  }

  @Output() menuClick = new EventEmitter<void>();

  menuItems = computed<MenuItem[]>(() => {
    const role = this.authService.currentUser()?.role;

    if (role === 'superadmin') {
      return [
        { route: 'superadmin', label: 'Dashboard', icon: 'LayoutDashboard' }
      ];
    } else if (role === 'driver') {
      return [
        { route: 'driver/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { route: 'driver/history', label: 'Trip History', icon: 'Calendar' }
      ];
    } else {
      return [
        { route: 'admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { route: 'admin/vehicles', label: 'Vehicles', icon: 'Car' },
        { route: 'admin/trips', label: 'Trips', icon: 'MapPin' },
        { route: 'admin/reports', label: 'Reports', icon: 'BarChart3' },
        // { route: 'admin/analytics', label: 'Analytics Engine', icon: 'Activity' },
        { route: 'admin/receivables', label: 'Receivables', icon: 'Bank' },
        { route: 'admin/customers', label: 'Customers', icon: 'Users' },
        { route: 'admin/drivers', label: 'Drivers', icon: 'Users' },
        { route: 'admin/settlement/driver', label: 'Driver Settlement', icon: 'Bank' },
        { route: 'admin/settlement/customer', label: 'Customer Settlement', icon: 'Receipt' }
      ];
    }
  });

  onMenuClick() {
    this.menuClick.emit();
  }

  getInitials(): string {
    const name = this.authService.currentUser()?.name;
    if (!name) return 'AD';
    const split = name.split(' ');
    if (split.length > 1) {
      return (split[0][0] + split[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.menuClick.emit();
  }
}

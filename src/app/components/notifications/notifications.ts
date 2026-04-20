import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="position-fixed" style="bottom: 100px; right: 25px; z-index: 1050;" *ngIf="showBell()">
      <div class="position-relative">
        <button class="btn btn-light bg-white rounded-circle shadow-lg p-2 position-relative border transition-all hover-scale" 
                (click)="toggleOverlay()" 
                style="width: 40px; height: 40px;justify-content: center;
                      align-items: center;
                      display: flex;
                      padding: 0 !important;">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-navy">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span *ngIf="overdueReceivables().length > 0" 
                class="position-absolute align-items-center justify-content-center d-flex bg-danger text-white rounded-circle fw-bold shadow-sm dot-pulse" 
                style="top: -2px; right: 0px; width: 24px; height: 24px; font-size: 0.75rem;">
            {{ overdueReceivables().length }}
          </span>
        </button>

        <!-- Dropdown / Overlay (Pops UP) -->
        <div *ngIf="isOpen()" 
             class="position-absolute end-0 bg-white rounded-4 shadow-lg border overflow-hidden animate-fade-in" 
             style="width: 340px; bottom: calc(100% + 15px); right: 0;">
          <div class="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <h6 class="fw-bold text-navy mb-0">Credit Alerts</h6>
            <span class="badge bg-danger rounded-pill px-3">{{ overdueReceivables().length }} Overdue</span>
          </div>
          
          <div class="overflow-y-auto" style="max-height: 400px;">
            <div *ngFor="let it of overdueReceivables()" 
                 class="p-3 border-bottom hover-bg-light cursor-pointer transition-all"
                 routerLink="/admin/receivables"
                 (click)="toggleOverlay()">
              <div class="d-flex justify-content-between align-items-start mb-1">
                <span class="fw-bold text-navy truncate-1 text-wrap w-75 lh-sm">{{ it.customerName }}</span>
                <span class="small text-danger fw-bold ms-2">₹{{ it.balanceAmount }}</span>
              </div>
              <div class="smaller text-secondary mb-1">Due Date: {{ it.dueDate | date:'MMM d, y' }}</div>
              <div class="smaller text-danger opacity-75 d-flex align-items-center gap-1 fw-bold">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Credit period elapsed
              </div>
            </div>

            <div *ngIf="overdueReceivables().length === 0" class="p-4 text-center text-secondary">
              <div class="mb-2 opacity-50">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="small mb-0">No overdue receivables! You're completely caught up.</p>
            </div>
          </div>
          
          <div class="p-2 border-top bg-light text-center">
            <a routerLink="/admin/receivables" (click)="toggleOverlay()" class="small fw-bold text-decoration-none text-navy hover-text-primary">View Full Ledger <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hover-bg-light:hover { background-color: var(--bs-light) !important; }
    .cursor-pointer { cursor: pointer; }
    .truncate-1 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
  `]
})
export class NotificationsComponent implements OnInit {
  authService = inject(AuthService);
  tripService = inject(TripService);
  customerService = inject(CustomerService);

  isOpen = signal(false);
  trips = signal<any[]>([]);
  customers = signal<any[]>([]);

  ngOnInit() {
    this.authService.getMe().subscribe(() => {
      if (this.authService.currentUser()?.role === 'admin') {
        this.loadData();

        // Basic polling to keep it updated without sockets (optional but good for a dashboard)
        setInterval(() => {
          if (this.authService.currentUser()?.role === 'admin') {
            this.loadData();
          }
        }, 60000); // 1-minute updates
      }
    });
  }

  loadData() {
    this.customerService.getAll().subscribe(c => this.customers.set(c));
    this.tripService.getTrips().subscribe(t => this.trips.set(t));
  }

  showBell = computed(() => {
    return this.authService.currentUser()?.role === 'admin';
  });

  overdueReceivables = computed(() => {
    const allTrips = this.trips();
    const allCusts = this.customers();

    if (!allTrips.length) return [];

    const overdue = allTrips.filter(t => t.tripType === 'Credit' && t.balanceAmount > 0).map(t => {
      let custIdStr = '';
      if (typeof t.customerId === 'object' && t.customerId) {
        custIdStr = t.customerId._id || t.customerId.id;
      } else {
        custIdStr = t.customerId;
      }

      const customer = allCusts.find(c => c._id === custIdStr) || t.customerId;
      const creditDays = customer?.creditPeriodDays || 0;
      const completionDate = t.endTime ? new Date(t.endTime) : new Date(t.updatedAt || t.startTime);

      const dueDate = new Date(completionDate.getTime());
      dueDate.setDate(dueDate.getDate() + creditDays);

      return {
        ...t,
        dueDate,
        isOverdue: new Date() > dueDate
      };
    }).filter(r => r.isOverdue);

    // Sort by largest amount first
    return overdue.sort((a, b) => b.balanceAmount - a.balanceAmount);
  });

  toggleOverlay() {
    this.isOpen.set(!this.isOpen());
  }
}

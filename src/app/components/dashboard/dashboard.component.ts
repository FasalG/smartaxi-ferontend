import { Component, OnInit, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';
import { RentalService } from '../../services/rental.service';
import { InventoryService } from '../../services/inventory.service';
import { BookingService } from '../../services/booking.service';
import { ExpenseService } from '../../services/expense.service';
import { CustomerService } from '../../services/customer.service';
import { RentalItem, Booking, Expense, Customer } from '../../models/rental.models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    RouterModule
  , MatTableModule, MatPaginatorModule],
  template: `
    <!-- Loader -->
    <div class="text-center py-5 my-5" *ngIf="isLoading()">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-2 text-secondary small">Setting up your dashboard...</div>
    </div>

    <ng-container *ngIf="!isLoading()">
      
      <!-- Quick Availability Checker -->
      <div class="card shadow-sm border-0 mb-4 bg-light">
        <div class="card-body p-3 p-md-4">
          <h5 class="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
            <svg width="20" height="20" fill="none" class="text-primary" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Quick Availability Checker
          </h5>
          <div class="row g-3 align-items-center">
            <div class="col-12 col-md-4">
              <mat-form-field appearance="outline" class="w-100 mb-0" (click)="checkDatePicker.open()">
                <mat-label>Select Date</mat-label>
                <input matInput [matDatepicker]="checkDatePicker" [ngModel]="checkDate()" (ngModelChange)="checkDate.set($event)" placeholder="Choose a date">
                <mat-datepicker-toggle matIconSuffix [for]="checkDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #checkDatePicker panelClass="bg-white-datepicker"></mat-datepicker>
              </mat-form-field>
            </div>
            <div class="col-12 col-md-8">
              <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Select Item</mat-label>
                <mat-select [ngModel]="checkItemId()" (ngModelChange)="checkItemId.set($event)" [disabled]="!checkDate()" placeholder="Select an item">
                  <mat-option *ngFor="let item of items()" [value]="item._id || item.id">
                    {{ item.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
          
          <div class="mt-3" *ngIf="checkAvailabilityResult() as result">
            <div class="alert py-2 mb-0 d-flex align-items-center gap-2 fw-medium" [ngClass]="result.available > 0 ? 'alert-success' : 'alert-danger'">
              <svg *ngIf="result.available > 0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <svg *ngIf="result.available === 0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span *ngIf="result.available > 0"><strong>{{ result.name }}</strong> is available! ({{ result.available }} in stock for this date)</span>
              <span *ngIf="result.available === 0"><strong>{{ result.name }}</strong> is completely booked out for this date.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-6 col-md-6 col-lg-3">
        <div class="card shadow-sm border-0 p-3 p-xl-4 h-100">
          <div class="d-flex flex-column flex-xxl-row align-items-start align-items-xxl-center gap-2 gap-xxl-3 overflow-hidden">
            <div class="p-2 p-md-3 bg-primary-subtle rounded-3 text-primary shadow-sm flex-shrink-0">
              <svg width="24" height="24" class="icon-responsive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12a9 9 0 110 18 9 9 0 010-18zm0 0V3m0 18v-3" />
              </svg>
            </div>
            <div class="w-100 overflow-hidden">
              <p class="text-secondary small mb-1 text-truncate w-100">Total Revenue</p>
              <h3 class="fw-bold mb-0 fs-5 fs-md-4 fs-xl-3 text-truncate w-100">{{ totalRevenue() | currency:'INR':'symbol' }}</h3>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-6 col-lg-3">
        <div class="card shadow-sm border-0 p-3 p-xl-4 h-100">
          <div class="d-flex flex-column flex-xxl-row align-items-start align-items-xxl-center gap-2 gap-xxl-3 overflow-hidden">
            <div class="p-2 p-md-3 bg-success-subtle rounded-3 text-success shadow-sm flex-shrink-0">
              <svg width="24" height="24" class="icon-responsive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div class="w-100 overflow-hidden">
              <p class="text-secondary small mb-1 text-truncate w-100">Active Rentals</p>
              <h3 class="fw-bold mb-0 fs-5 fs-md-4 fs-xl-3 text-truncate w-100">{{ activeRentalsCount() }}</h3>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-6 col-lg-3">
        <div class="card shadow-sm border-0 p-3 p-xl-4 h-100">
          <div class="d-flex flex-column flex-xxl-row align-items-start align-items-xxl-center gap-2 gap-xxl-3 overflow-hidden">
            <div class="p-2 p-md-3 bg-info-subtle rounded-3 text-info shadow-sm flex-shrink-0">
              <svg width="24" height="24" class="icon-responsive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="w-100 overflow-hidden">
              <p class="text-secondary small mb-1 text-truncate w-100">Items Available</p>
              <h3 class="fw-bold mb-0 fs-5 fs-md-4 fs-xl-3 text-truncate w-100">{{ availableItemsCount() }}</h3>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-6 col-lg-3">
        <div class="card shadow-sm border-0 p-3 p-xl-4 h-100">
          <div class="d-flex flex-column flex-xxl-row align-items-start align-items-xxl-center gap-2 gap-xxl-3 overflow-hidden">
            <div class="p-2 p-md-3 bg-warning-subtle rounded-3 text-warning-emphasis shadow-sm flex-shrink-0">
              <svg width="24" height="24" class="icon-responsive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="w-100 overflow-hidden">
              <p class="text-secondary small mb-1 text-truncate w-100">Pending Bookings</p>
              <h3 class="fw-bold mb-0 fs-5 fs-md-4 fs-xl-3 text-truncate w-100">{{ pendingBookingsCount() }}</h3>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold mb-0">Recent Rentals</h5>
            <button routerLink="/bookings" class="btn btn-sm btn-link text-decoration-none fw-semibold">View All</button>
          </div>
          <div class="table-responsive p-0">
            <table mat-table [dataSource]="dataSource" class="w-100 table-hover align-middle mt-3 mb-0" *ngIf="recentRentals().length > 0">
              <ng-container matColumnDef="item">
                <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Item</th>
                <td mat-cell *matCellDef="let booking" class="px-4 py-3 fw-medium text-dark">
                  {{ getItemName(booking.items[0]?.item) }}
                  <span *ngIf="booking.items.length > 1" class="text-secondary smaller ms-1">+{{ booking.items.length - 1 }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Customer</th>
                <td mat-cell *matCellDef="let booking" class="px-4 py-3 text-secondary">{{ getCustomerName(booking.customer) }}</td>
              </ng-container>

              <ng-container matColumnDef="end_date">
                <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">End Date</th>
                <td mat-cell *matCellDef="let booking" class="px-4 py-3 text-secondary">{{ booking.end_date | date:'mediumDate' }}</td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Amount</th>
                <td mat-cell *matCellDef="let booking" class="px-4 py-3 fw-bold text-dark">{{ booking.amount | currency:'INR':'symbol' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Status</th>
                <td mat-cell *matCellDef="let booking" class="px-4 py-3">
                  <span [class]="booking.status === 'closed' ? 'badge bg-secondary' : 'badge bg-success-subtle text-success'">
                    {{ booking.status | titlecase }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns" class="table-light text-secondary small text-uppercase"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="small"></tr>
            </table>

            <div *ngIf="recentRentals().length === 0" class="text-center py-4 text-secondary">
              No recent bookings found.
            </div>
            
            <mat-paginator [class.d-none]="recentRentals().length === 0" [pageSizeOptions]="[10, 25, 50]" [pageSize]="10" showFirstLastButtons></mat-paginator>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="card shadow-sm border-0 h-100 p-4">
          <h5 class="fw-bold mb-4">Financial Summary</h5>
          <div class="d-flex flex-column gap-3">
            <div class="p-3 bg-light rounded-3">
              <p class="small text-secondary mb-1">Monthly Expenses</p>
              <h4 class="fw-bold text-danger mb-0">{{ monthlyExpenses() | currency:'INR':'symbol' }}</h4>
            </div>
            <div class="p-3 bg-light rounded-3">
              <p class="small text-secondary mb-1">Monthly Gross Profit</p>
              <h4 class="fw-bold text-success mb-0">{{ grossProfit() | currency:'INR':'symbol' }}</h4>
            </div>
            <hr class="my-2 border-secondary opacity-10">
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="small fw-semibold text-secondary">Outstanding Payments</span>
              <span class="fw-bold text-warning-emphasis">{{ outstandingPayments() | currency:'INR':'symbol' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small fw-semibold text-secondary">Utilization Rate</span>
              <span class="fw-bold text-primary">{{ utilizationRate() }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ng-container>
  `,
  styles: [`
    .icon-responsive { width: 20px; height: 20px; }
    @media (min-width: 1400px) { .icon-responsive { width: 24px; height: 24px; } }
  `]
})
export class DashboardComponent implements OnInit {
  displayedColumns: string[] = ['item', 'customer', 'end_date', 'amount', 'status'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      this.dataSource.data = this.recentRentals();
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  isLoading = signal(true);
  items = signal<RentalItem[]>([]);
  bookings = signal<Booking[]>([]);
  expenses = signal<Expense[]>([]);
  customers = signal<Customer[]>([]);

  // Checker State
  checkDate = signal<Date | string | null>(null);
  checkItemId = signal<string | null>(null);

  checkAvailabilityResult = computed(() => {
    const targetObj = this.checkDate();
    const itemId = this.checkItemId();

    if (!targetObj || !itemId) return null;

    const targetDate = new Date(targetObj);
    if (isNaN(targetDate.getTime())) return null;

    targetDate.setHours(0, 0, 0, 0);

    const item = this.items().find(i => (i._id || i.id) === itemId);
    if (!item) return null;

    const overlappingBookings = this.bookings().filter((b: any) => {
      if (!['active', 'pending', 'confirmed'].includes(b.status)) return false;

      const bStart = new Date(b.start_date as string);
      const bEnd = new Date(b.end_date as string);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(23, 59, 59, 999);

      return bStart.getTime() <= targetDate.getTime() && bEnd.getTime() >= targetDate.getTime();
    });

    let rentedQuantity = 0;
    overlappingBookings.forEach((b: any) => {
      const bItemWrap = b.items?.find((i: any) => {
        const bItem = i.item;
        const bItemId = typeof bItem === 'object' ? bItem?._id || bItem?.id : bItem;
        return bItemId === itemId;
      });
      if (bItemWrap) {
        rentedQuantity += (bItemWrap.quantity || 1);
      }
    });

    const avail = Math.max(0, item.total_quantity - rentedQuantity);
    return { name: item.name, available: avail };
  });

  totalRevenue = computed(() => this.bookings().reduce((sum, b) => b.status !== 'cancelled' ? sum + b.amount : sum, 0));
  activeRentalsCount = computed(() => this.bookings().filter(b => b.status === 'active').length);

  availableItemsCount = computed(() => {
    const totalItems = this.items().reduce((sum, item) => sum + item.total_quantity, 0);
    const rentedItems = this.bookings()
      .filter(b => b.status === 'active')
      .reduce((sum, b) => {
        return sum + b.items.reduce((itemSum, i) => itemSum + i.quantity, 0);
      }, 0);
    return Math.max(0, totalItems - rentedItems);
  });

  pendingBookingsCount = computed(() => this.bookings().filter(b => b.status === 'pending').length);
  recentRentals = computed(() => [...this.bookings()].reverse().slice(0, 5));
  monthlyExpenses = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));
  grossProfit = computed(() => this.totalRevenue() - this.monthlyExpenses());

  outstandingPayments = computed(() => this.bookings().reduce((sum, b) => {
    if (b.status === 'cancelled') return sum;
    return sum + Math.max(0, b.amount - (b.initial_payment_received || 0));
  }, 0));

  utilizationRate = computed(() => {
    const total = this.items().reduce((sum, i) => sum + i.total_quantity, 0);
    if (total === 0) return '0';
    const rented = total - this.availableItemsCount();
    return ((rented / total) * 100).toFixed(1);
  });

  private inventoryService = inject(InventoryService);
  private bookingService = inject(BookingService);
  private expenseService = inject(ExpenseService);
  private customerService = inject(CustomerService);

  ngOnInit() {
    this.isLoading.set(true);
    forkJoin({
      items: this.inventoryService.getAll().pipe(catchError(() => of([]))),
      bookings: this.bookingService.getAll().pipe(catchError(() => of([]))),
      expenses: this.expenseService.getAll().pipe(catchError(() => of([]))),
      customers: this.customerService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.items.set(data.items);
        this.bookings.set(data.bookings);
        this.expenses.set(data.expenses);
        this.customers.set(data.customers);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Dashboard data load error', err);
        this.isLoading.set(false);
      }
    });
  }

  getItemName(data: any): string {
    if (!data) return 'Unknown';
    const id = typeof data === 'object' ? (data._id || data.id) : data;
    return this.items().find(i => (i._id || i.id) === id)?.name || 'Unknown';
  }

  getCustomerName(data: any): string {
    if (!data) return 'Unknown';
    const id = typeof data === 'object' ? (data._id || data.id) : data;
    return this.customers().find(c => (c._id || c.id) === id)?.name || 'Unknown';
  }
}

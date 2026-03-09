import { Component, OnInit, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RentalService } from '../../services/rental.service';
import { CustomerService } from '../../services/customer.service';
import { InventoryService } from '../../services/inventory.service';
import { Rental, Customer, RentalItem } from '../../models/rental.models';
import { FormsModule } from '@angular/forms';
import { RentalFormDialogComponent } from '../../features/rentals/components/rental-form-dialog/rental-form-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-rentals',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, MatTableModule, MatPaginatorModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Active Rentals</h2>
          <p class="text-secondary mb-0">Track and manage all current rentals</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openRentalDialog()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Rental
        </button>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Active Rentals</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ activeCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Overdue</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-danger mb-0 text-truncate">{{ overdueCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Active Revenue</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-success mb-0 text-truncate">{{ totalRevenue() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Unpaid Amount</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-warning-emphasis mb-0 text-truncate">{{ unpaidAmount() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
      </div>

      <!-- Rentals Table -->
      <div class="card shadow-sm border-0 overflow-hidden mb-4">
        <!-- Loader -->
        <div class="card-body text-center py-5" *ngIf="isLoading()">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2 text-secondary small">Loading active rentals...</div>
        </div>

        <div class="table-responsive" [class.d-none]="isLoading()">
          <table mat-table [dataSource]="dataSource" class="w-100 table-hover align-middle mb-0">
            <ng-container matColumnDef="rental_number">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Rental #</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small fw-medium text-dark">{{ rental.rental_number }}</td>
            </ng-container>

            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Customer</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small text-secondary">{{ getCustomerName(rental.customer) }}</td>
            </ng-container>

            <ng-container matColumnDef="item">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Item</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small fw-medium text-dark">{{ getItemName(rental.item) }}</td>
            </ng-container>

            <ng-container matColumnDef="start_date">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Start Date</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small text-secondary text-nowrap">{{ rental.start_date }}</td>
            </ng-container>

            <ng-container matColumnDef="due_date">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Due Date</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small text-secondary text-nowrap">{{ rental.due_date }}</td>
            </ng-container>

            <ng-container matColumnDef="total_amount">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Total</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 small fw-bold text-dark">{{ rental.total_amount | currency:'INR':'symbol' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Status</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3">
                <span [class]="getStatusClass(rental.status)">{{ rental.status | titlecase }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="payment_status">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Payment</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3">
                <span [class]="getPaymentStatusClass(rental.payment_status)">{{ rental.payment_status | titlecase }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0 text-end">Actions</th>
              <td mat-cell *matCellDef="let rental" class="px-4 py-3 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button class="btn btn-sm btn-link p-1 text-primary" (click)="openRentalDialog(rental)">
                     <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button class="btn btn-sm btn-link p-1 text-danger" (click)="deleteRental((rental._id || rental.id)!)">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="table-light"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-bg-light"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="10" showFirstLastButtons></mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hover-bg-light:hover { background-color: var(--bs-light); }
  `]
})
export class RentalsComponent implements OnInit {
  displayedColumns: string[] = ['rental_number', 'customer', 'item', 'start_date', 'due_date', 'total_amount', 'status', 'payment_status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      this.dataSource.data = this.rentals();
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  isLoading = signal(true);
  rentals = signal<Rental[]>([]);
  customers = signal<Customer[]>([]);
  items = signal<RentalItem[]>([]);

  activeCount = computed(() => {
    return this.rentals().filter((r) => r.status === 'active').length;
  });

  overdueCount = computed(() => {
    return this.rentals().filter((r) => r.status === 'overdue').length;
  });

  totalRevenue = computed(() => {
    return this.rentals().reduce((sum, r) => sum + r.total_amount, 0);
  });

  unpaidAmount = computed(() => {
    return this.rentals().reduce((sum, r) => sum + (r.total_amount - r.paid_amount), 0);
  });

  private rentalService = inject(RentalService);
  private customerService = inject(CustomerService);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    forkJoin({
      rentals: this.rentalService.getAll().pipe(catchError(() => of([]))),
      customers: this.customerService.getAll().pipe(catchError(() => of([]))),
      items: this.inventoryService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.rentals.set(data.rentals);
        this.customers.set(data.customers);
        this.items.set(data.items);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Rentals payload error', err);
        this.isLoading.set(false);
      }
    });
  }

  loadRentals() {
    this.rentalService.getAll().subscribe(data => this.rentals.set(data));
  }

  loadCustomers() {
    this.customerService.getAll().subscribe(data => this.customers.set(data));
  }

  loadItems() {
    this.inventoryService.getAll().subscribe(data => this.items.set(data));
  }

  getEmptyRental(): Partial<Rental> {
    return {
      customer: '',
      item: '',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      duration_days: 1,
      total_amount: 0,
      paid_amount: 0,
      status: 'active',
      payment_status: 'unpaid'
    };
  }

  getCustomerName(id?: string): string {
    return this.customers().find(c => (c._id || c.id) === id)?.name || 'Unknown';
  }

  getItemName(id?: string): string {
    return this.items().find(i => (i._id || i.id) === id)?.name || 'Unknown';
  }

  calculateTotal(rental: Partial<Rental>) {
    const item = this.items().find(i => (i._id || i.id) === rental.item);
    if (item && rental.duration_days) {
      rental.total_amount = item.daily_rate * rental.duration_days;
    }
  }

  // Placeholder for missing logic if needed

  getStatusClass(status: string): string {
    const base = 'badge rounded-pill fw-normal px-3 py-2';
    switch (status) {
      case 'active': return `₹{base} bg-primary-subtle text-primary border border-primary`;
      case 'overdue': return `₹{base} bg-danger-subtle text-danger border border-danger`;
      case 'returned': return `₹{base} bg-success-subtle text-success border border-success`;
      case 'extended': return `₹{base} bg-info-subtle text-info border border-info`;
      default: return `₹{base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  getPaymentStatusClass(status: string): string {
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    switch (status) {
      case 'paid': return `₹{base} bg-success`;
      case 'partial': return `₹{base} bg-warning text-dark border border-warning`;
      case 'unpaid': return `₹{base} bg-danger`;
      default: return `₹{base} bg-secondary`;
    }
  }

  openRentalDialog(rental?: Rental) {
    const dialogRef = this.dialog.open(RentalFormDialogComponent, {
      data: {
        rental: rental ? { ...rental } : this.getEmptyRental(),
        isEditing: !!rental
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!!rental) {
          this.rentalService.update(result as Rental).subscribe(() => this.loadRentals());
        } else {
          const newRental = {
            ...result,
            rental_number: this.rentalService.generateCode('RNT'),
            created_at: new Date().toISOString()
          } as Rental;
          this.rentalService.add(newRental).subscribe(() => this.loadRentals());
        }
      }
    });
  }

  deleteRental(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this rental?', 'Confirm Delete', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.rentalService.delete(id).subscribe(() => {
        this.loadRentals();
      });
    });
  }
}

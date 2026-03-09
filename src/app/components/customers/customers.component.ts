import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/rental.models';
import { CustomerFormDialogComponent } from '../../features/customers/components/customer-form-dialog/customer-form-dialog.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Customer Management</h2>
          <p class="text-secondary mb-0">View and manage your rental customers</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openCustomerDialog()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Customers</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-dark mb-0 text-truncate">{{ customers().length }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Active Customers</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-success mb-0 text-truncate">{{ activeCustomersCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">GST Registered</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ gstRegisteredCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Internal Code Range</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-info-emphasis mb-0 text-truncate">CUS-001</p>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="card shadow-sm border-0 p-4 mb-4">
        <div class="input-group">
          <span class="input-group-text bg-transparent border-end-0 text-secondary">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search customers by name, email, or company..."
            class="form-control border-start-0 ps-0"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
        </div>
      </div>

      </div>

      <!-- Loader -->
      <div class="text-center py-5" *ngIf="isLoading()">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="mt-2 text-secondary small">Loading customers...</div>
      </div>

      <div class="row g-4" *ngIf="!isLoading()">
        <div *ngFor="let customer of filteredCustomers()" class="col-12 col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0 hover-shadow transition-shadow">
            <div class="card-body p-4">
              <div class="d-flex align-items-center justify-content-between mb-4">
                <div class="d-flex align-items-center gap-3">
                  <div class="avatar align-items-center justify-content-center bg-primary-subtle rounded-circle d-flex" style="width: 48px; height: 48px;">
                    <span class="text-primary fw-bold fs-5">{{ getInitials(customer.name) }}</span>
                  </div>
                  <div>
                    <h5 class="card-title fw-bold mb-0 text-dark">{{ customer.name }}</h5>
                    <span [class]="customer.status === 'active' ? 'badge bg-success-subtle text-success' : 'badge bg-secondary-subtle text-secondary'">
                      {{ customer.status | titlecase }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <p class="small fw-semibold text-dark mb-2">{{ customer.company || 'Individual' }}</p>
                <div class="d-flex align-items-center gap-2 text-secondary small mb-1">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span class="text-truncate" style="max-width: 200px;">{{ customer.email }}</span>
                </div>
                <div class="d-flex align-items-center gap-2 text-secondary small mb-1">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{{ customer.phone }}</span>
                </div>
              </div>

              <div class="border-top pt-4 mb-4">
                <div class="list-group list-group-flush small">
                  <div class="list-group-item px-0 py-1 border-0 d-flex justify-content-between align-items-center">
                    <span class="text-secondary">Code:</span>
                    <span class="fw-bold text-dark">{{ customer.customer_code }}</span>
                  </div>
                  <div class="list-group-item px-0 py-1 border-0 d-flex justify-content-between align-items-center">
                    <span class="text-secondary">GST Status:</span>
                    <span [class]="customer.gst_registered ? 'badge bg-success-subtle text-success' : 'badge bg-secondary-subtle text-secondary'">
                      {{ customer.gst_registered ? 'Registered' : 'No' }}
                    </span>
                  </div>
                  <div *ngIf="customer.gst_registered" class="list-group-item px-0 py-1 border-0 d-flex justify-content-between align-items-center">
                    <span class="text-secondary">GSTIN:</span>
                    <span class="font-monospace text-dark small">{{ customer.gst_number }}</span>
                  </div>
                  <div class="list-group-item px-0 py-1 border-0 d-flex justify-content-between align-items-center">
                    <span class="text-secondary">Location:</span>
                    <span class="text-dark">{{ customer.city }}, {{ customer.country }}</span>
                  </div>
                </div>
              </div>

              <div class="d-flex gap-2 mt-auto">
              <div class="d-flex gap-2 mt-auto">
                <button class="btn btn-outline-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1" (click)="openCustomerDialog(customer)">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button class="btn btn-outline-danger btn-sm p-2" (click)="deleteCustomer((customer._id || customer.id)!)">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar { flex-shrink: 0; }
    .smaller { font-size: 0.7rem; }
    .hover-shadow:hover { 
      box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
    }
    .transition-shadow {
      transition: box-shadow 0.3s ease-in-out;
    }
  `]
})
export class CustomersComponent implements OnInit {
  isLoading = signal(true);
  searchTerm = signal('');
  customers = signal<Customer[]>([]);

  filteredCustomers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.customers().filter(
      (c) =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.company && c.company.toLowerCase().includes(term))
    );
  });

  activeCustomersCount = computed(() => {
    return this.customers().filter((c) => c.status === 'active').length;
  });

  gstRegisteredCount = computed(() => {
    return this.customers().filter((c) => c.gst_registered).length;
  });

  private customerService = inject(CustomerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading.set(true);
    this.customerService.getAll().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getEmptyCustomer(): Partial<Customer> {
    return {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      gst_registered: false,
      gst_number: '',
      status: 'active'
    };
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(n => n)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  openCustomerDialog(customer?: Customer) {
    const dialogRef = this.dialog.open(CustomerFormDialogComponent, {
      data: {
        customer: customer ? { ...customer } : this.getEmptyCustomer(),
        isEditing: !!customer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (customer) {
          this.customerService.update(result as Customer).subscribe(() => this.loadCustomers());
        } else {
          const newCustomer = {
            ...result,
            customer_code: this.customerService.generateCode('CUS'),
            created_at: new Date().toISOString()
          } as Customer;
          this.customerService.add(newCustomer).subscribe(() => this.loadCustomers());
        }
      }
    });
  }

  deleteCustomer(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this customer?', 'Confirm Delete', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.customerService.delete(id).subscribe(() => {
        this.loadCustomers();
      });
    });
  }
}

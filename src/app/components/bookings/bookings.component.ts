import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingService } from '../../services/booking.service';
import { CustomerService } from '../../services/customer.service';
import { InventoryService } from '../../services/inventory.service';
import { RentalService } from '../../services/rental.service';
import { Booking, Invoice, Customer, RentalItem } from '../../models/rental.models';
import { BookingFormDialogComponent } from '../../features/bookings/components/booking-form-dialog/booking-form-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, MatPaginatorModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Bookings & Reservations</h2>
          <p class="text-secondary mb-0">Manage customer reservations and future rentals</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openBookingDialog()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </button>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Active Bookings</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-success mb-0 text-truncate">{{ activeCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Pending Confirmation</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-warning-emphasis mb-0 text-truncate">{{ pendingCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Booking Value</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ totalBookingValue() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Cancelled</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-danger mb-0 text-truncate">{{ cancelledCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Bookings Table -->
      <div class="card shadow-sm border-0 overflow-hidden mb-4">
        <div class="card-header bg-white border-0 p-4 pb-0">
          <h5 class="fw-bold mb-0">Current Reservations</h5>
        </div>
        
        <!-- Loader -->
        <div class="card-body text-center py-5" *ngIf="isLoading()">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2 text-secondary small">Loading reservations...</div>
        </div>

        <div class="table-responsive" *ngIf="!isLoading()">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Booking #</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Customer</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Equipment</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Dates</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Amount</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0">Status</th>
                <th class="px-4 py-3 text-secondary small text-uppercase fw-medium border-0 text-end">Actions</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              <tr *ngFor="let booking of paginatedBookings()" class="hover-bg-light">
                <td class="px-4 py-3 small fw-medium text-dark">{{ booking.booking_number }}</td>
                <td class="px-4 py-3 small text-secondary">{{ getCustomerName(booking.customer) }}</td>
                <td class="px-4 py-3 small fw-medium text-dark">
                  <div class="d-flex flex-column gap-1">
                    <span *ngFor="let itemWrap of booking.items" class="badge bg-light text-dark border fw-normal text-start">
                      {{ getItemName(itemWrap.item) }} (x{{ itemWrap.quantity }})
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 small text-secondary">
                   <div>{{ booking.start_date | date:'mediumDate' }}</div>
                   <div class="smaller text-muted">to {{ booking.end_date | date:'mediumDate' }}</div>
                </td>
                <td class="px-4 py-3 small fw-bold text-dark">
                  <div>{{ booking.amount | currency:'INR':'symbol' }}</div>
                  <div class="smaller text-success" *ngIf="booking.initial_payment_received > 0">
                    Paid: {{ booking.initial_payment_received | currency:'INR':'symbol' }}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span [class]="getStatusClass(booking.status)">
                    {{ booking.status | titlecase }}
                  </span>
                </td>
                <td class="px-4 py-3 text-end">
                  <div class="d-flex align-items-center justify-content-end gap-1">
                    <button class="btn btn-sm btn-outline-primary p-1 border-0" title="Download Invoice" *ngIf="['pending', 'active'].includes(booking.status)" (click)="downloadInvoice(booking)">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-outline-info p-1 border-0" title="Download Receipt" *ngIf="booking.initial_payment_received > 0" (click)="downloadReceipt(booking)">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button class="btn btn-sm text-success p-1 border-0" title="Send WhatsApp Confirmation" (click)="sendWhatsAppConfirmation(booking)">
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-link p-1 text-primary" (click)="openBookingDialog(booking)">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-link p-1 text-danger" (click)="deleteBooking((booking._id || booking.id)!)" *ngIf="['pending', 'confirmed'].includes(booking.status)">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <mat-paginator 
            [length]="bookings().length" 
            [pageSize]="pageSize()" 
            [pageSizeOptions]="[10, 25, 50]" 
            (page)="onPageChange($event)">
          </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hover-bg-light:hover { background-color: var(--bs-light); }
    .smaller { font-size: 0.75rem; }
  `]
})
export class BookingsComponent implements OnInit {
  pageIndex = signal(0);
  pageSize = signal(10);

  paginatedBookings = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.bookings().slice(start, start + this.pageSize());
  });

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  constructor() {
  }

  isLoading = signal(true);
  bookings = signal<Booking[]>([]);
  customers = signal<Customer[]>([]);
  items = signal<RentalItem[]>([]);

  activeCount = computed(() => {
    return this.bookings().filter(b => b.status === 'active').length;
  });

  pendingCount = computed(() => {
    return this.bookings().filter(b => b.status === 'pending').length;
  });

  cancelledCount = computed(() => {
    return this.bookings().filter(b => b.status === 'cancelled').length;
  });

  totalBookingValue = computed(() => {
    return this.bookings().filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.amount, 0);
  });

  private bookingService = inject(BookingService);
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
      bookings: this.bookingService.getAll().pipe(catchError(() => of([]))),
      customers: this.customerService.getAll().pipe(catchError(() => of([]))),
      items: this.inventoryService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.bookings.set(data.bookings);
        this.customers.set(data.customers);
        this.items.set(data.items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadBookings() {
    this.bookingService.getAll().subscribe(data => this.bookings.set(data));
  }

  getEmptyBooking(): Partial<Booking> {
    return {
      customer: '',
      items: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      duration_days: 1,
      amount: 0,
      initial_payment_received: 0,
      payment_method: 'none',
      status: 'pending'
    };
  }

  getCustomerName(data: any): string {
    if (!data) return 'Unknown';
    if (typeof data === 'object' && data.name) return data.name;
    return this.customers().find(c => (c._id || c.id) === data)?.name || 'Unknown';
  }

  getItemName(data: any): string {
    if (!data) return 'Unknown';
    if (typeof data === 'object' && data.name) return data.name;
    return this.items().find(i => (i._id || i.id) === data)?.name || 'Unknown';
  }

  getStatusClass(status: string): string {
    const base = 'badge rounded-pill fw-normal px-3 py-2';
    switch (status) {
      case 'active': return `${base} bg-success text-white border border-success`;
      case 'confirmed': return `${base} bg-success-subtle text-success border border-success`;
      case 'pending': return `${base} bg-warning-subtle text-warning-emphasis border border-warning`;
      case 'cancelled': return `${base} bg-danger-subtle text-danger border border-danger`;
      case 'closed': return `${base} bg-secondary-subtle text-secondary border border-secondary`;
      default: return `${base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  openBookingDialog(booking?: Booking) {
    const dialogRef = this.dialog.open(BookingFormDialogComponent, {
      data: {
        booking: booking ? { ...booking } : this.getEmptyBooking(),
        isEditing: !!booking,
        customers: this.customers(),
        items: this.items(),
        bookings: this.bookings()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();

        // We prompt the user using a snackbar action if they want to send WhatsApp for the newly created/saved booking
        const snack = this.snackBar.open('Booking saved successfully.', 'Send WhatsApp', { duration: 6000, panelClass: ['success-snackbar'] });
        snack.onAction().subscribe(() => {
          // Locate newly added booking or use result object
          let targetBooking = result.booking || null;
          // If direct object is not returned from popup, fetch the most recent one by this customer just inserted:
          // As a fallback, we can use the latest returned booking data. For simplicity let's pass formatting text.
          // Assumes "result" contains the saved booking data object. If it doesn't, they can just click the table row.
          if (targetBooking) {
            this.sendWhatsAppConfirmation(targetBooking);
          } else {
            this.snackBar.open('Please click the WhatsApp icon next to the booking row to send confirmation.', 'Close', { duration: 4000 });
          }
        });
      }
    });
  }

  updateStatus(booking: Booking, status: 'confirmed' | 'active' | 'cancelled' | 'closed') {
    const updated = { ...booking, status };
    this.bookingService.update(updated).subscribe(() => this.loadBookings());
  }

  deleteBooking(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to cancel this booking?', 'Confirm Cancel', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.bookingService.delete(id).subscribe(() => {
        this.loadBookings();
      });
    });
  }

  downloadInvoice(booking: Booking) {
    const id = booking._id || booking.id;
    if (!id) return;
    this.bookingService.downloadInvoice(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${booking.booking_number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Invoice downloaded successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => this.snackBar.open('Failed to download invoice', 'Close', { duration: 4000, panelClass: ['bg-danger', 'text-white'] })
    });
  }

  downloadReceipt(booking: Booking) {
    const id = booking._id || booking.id;
    if (!id) return;
    this.bookingService.downloadReceipt(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt-${booking.booking_number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Receipt downloaded successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => this.snackBar.open('Failed to download receipt', 'Close', { duration: 4000, panelClass: ['bg-danger', 'text-white'] })
    });
  }

  sendWhatsAppConfirmation(booking: Booking) {
    let customerObj = booking.customer;
    if (typeof customerObj === 'string') {
      customerObj = this.customers().find(c => (c._id || c.id) === customerObj);
    }

    if (!customerObj || !customerObj.phone) {
      this.snackBar.open('Customer phone number not found', 'Close', { duration: 3000, panelClass: ['bg-warning', 'text-dark'] });
      return;
    }

    const phone = customerObj.phone.replace(/[^0-9]/g, '');
    let finalPhone = phone;
    // Basic formatting assuming Indian +91 if length is 10
    if (finalPhone.length === 10) {
      finalPhone = '91' + finalPhone;
    } else if (!finalPhone.startsWith('91') && finalPhone.length > 10) {
      // Just use whatever they provided if it has country code
    }

    // Construct items string
    const itemsText = booking.items.map(i => {
      const itemName = this.getItemName(i.item);
      return `- ${itemName} (Qty: ${i.quantity})`;
    }).join('\n'); // Standard newline

    const startDate = new Date(booking.start_date).toLocaleDateString();
    const endDate = new Date(booking.end_date).toLocaleDateString();

    const rawMessage = `Hello ${customerObj.name},

Thank you for your booking with us.

*Booking Details:*
Booking #: ${booking.booking_number}
Start Date: ${startDate}
End Date: ${endDate}

*Items:*
${itemsText}

*Total Amount:* ₹${booking.amount}
*Amount Paid:* ₹${booking.initial_payment_received}
*Balance Due:* ₹${booking.amount - booking.initial_payment_received}

We look forward to serving you!`;

    const formattedMessage = encodeURIComponent(rawMessage);
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${formattedMessage}`;
    window.open(whatsappUrl, '_blank');
  }
}

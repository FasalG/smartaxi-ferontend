import { Component, OnInit, inject, signal, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BankDetailService } from '../../services/bank-detail.service';
import { BookingService } from '../../services/booking.service';
import { BankDetail, Booking } from '../../models/rental.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-bank-details',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Bank Details & Payments</h2>
          <p class="text-secondary mb-0">Manage bank accounts and track payment collections</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="showForm = true; resetForm()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Bank Account
        </button>
      </div>

      <div class="row g-4">
        <!-- Bank Accounts List -->
        <div class="col-12 col-lg-8" [class.col-lg-12]="!showForm">
          
          <!-- Loader -->
          <div class="text-center py-5" *ngIf="isLoading()">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2 text-secondary small">Syncing bank details...</div>
          </div>

          <div class="row g-3" *ngIf="!isLoading()">
            
            <!-- Cash Summary Card -->
            <div class="col-12 col-md-6 text-dark" *ngIf="bankDetails().length >= 0">
              <div class="card shadow-sm border-0 h-100 p-4" style="background-color: var(--bs-success-bg-subtle, #d1e7dd); border-left: 4px solid var(--bs-success) !important;">
                <div class="d-flex justify-content-between mb-3">
                  <div class="badge bg-success text-white px-3 py-2">Cash Payments</div>
                  <button class="btn btn-sm btn-link text-success p-0 fw-bold text-decoration-none" (click)="openHistory('cash')">View History</button>
                </div>
                <h5 class="fw-bold mb-1 text-success">Cash in Hand</h5>
                <p class="text-secondary small mb-3">Physical cash payments received</p>
                <div class="mt-auto">
                  <span class="text-secondary small d-block mb-1">Total Collected</span>
                  <h3 class="fw-bold text-success mb-0">{{ getCashTotal() | currency:'INR':'symbol' }}</h3>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6" *ngFor="let bank of bankDetails()">
              <div class="card shadow-sm border-0 h-100 p-4" style="border-left: 4px solid var(--bs-primary) !important;">
                <div class="d-flex justify-content-between mb-3">
                  <div class="badge bg-primary-subtle text-primary border border-primary px-3 py-2" *ngIf="bank.is_default">Default</div>
                  <div *ngIf="!bank.is_default"></div>
                  <div class="ms-auto d-flex gap-3">
                    <button class="btn btn-sm btn-link text-info p-0 fw-bold text-decoration-none" (click)="openHistory('bank', bank)">History</button>
                    <button class="btn btn-sm btn-link text-primary p-0 text-decoration-none" (click)="editBank(bank)">Edit</button>
                    <button class="btn btn-sm btn-link text-danger p-0 text-decoration-none" (click)="deleteBank(bank)">Delete</button>
                  </div>
                </div>
                <h5 class="fw-bold mb-1">{{ bank.bank_name }}</h5>
                <p class="text-secondary small mb-1 text-truncate" title="Metric">{{ bank.account_holder }}</p>

                <div class="mt-2 mb-3">
                  <span class="text-secondary small d-block mb-1">Total Collected</span>
                  <h4 class="fw-bold text-primary mb-0">{{ getBankTotal(bank._id || bank.id) | currency:'INR':'symbol' }}</h4>
                </div>

                <div class="bg-light rounded p-3 mt-auto">
                  <div class="d-flex justify-content-between mb-2">
                    <span class="text-secondary small">Account No</span>
                    <span class="fw-medium">{{ bank.account_number }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="text-secondary small">IFSC Code</span>
                    <span class="fw-medium text-uppercase">{{ bank.ifsc_code }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add/Edit Form -->
        <div class="col-12 col-lg-4" *ngIf="showForm">
          <div class="card shadow-sm border-0 p-4 sticky-top" style="top: 2rem;">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <h5 class="fw-bold mb-0">{{ isEditing ? 'Edit Account' : 'New Bank Account' }}</h5>
              <button type="button" class="btn-close" (click)="showForm = false"></button>
            </div>

            <form #bankForm="ngForm" (ngSubmit)="saveBank()">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Account Holder Name</label>
                <input type="text" class="form-control" name="account_holder" [(ngModel)]="currentBank.account_holder" required placeholder="e.g. John Doe">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Bank Name</label>
                <input type="text" class="form-control" name="bank_name" [(ngModel)]="currentBank.bank_name" required placeholder="e.g. HDFC Bank">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Account Number</label>
                <input type="text" class="form-control" name="account_number" [(ngModel)]="currentBank.account_number" required placeholder="0000 0000 0000">
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">IFSC Code</label>
                <input type="text" class="form-control" name="ifsc_code" [(ngModel)]="currentBank.ifsc_code" required placeholder="HDFC0000123" style="text-transform: uppercase;">
              </div>
              <div class="mb-4">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" name="is_default" [(ngModel)]="currentBank.is_default" id="flexSwitchCheckDefault">
                  <label class="form-check-label small" for="flexSwitchCheckDefault">Set as default for bookings</label>
                </div>
              </div>

              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary py-2 fw-bold" [disabled]="!bankForm.valid">
                  {{ isEditing ? 'Update Account' : 'Save Bank Account' }}
                </button>
                <button type="button" class="btn btn-light py-2" (click)="showForm = false">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- History Dialog Template -->
    <ng-template #historyDialog let-data>
      <div class="p-4 bg-white rounded">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h5 class="fw-bold mb-0 text-primary">{{ data.title }} History</h5>
          <button class="btn-close" mat-dialog-close></button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-sm align-middle">
            <thead class="table-light">
              <tr>
                <th class="py-2 text-secondary small fw-medium">Date</th>
                <th class="py-2 text-secondary small fw-medium">Booking #</th>
                <th class="py-2 text-secondary small fw-medium">Customer</th>
                <th class="py-2 text-secondary small fw-medium text-end">Amount Paid</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              <tr *ngFor="let txn of data.transactions">
                <td class="py-2 small">{{ txn.start_date | date:'mediumDate' }}</td>
                <td class="py-2 small fw-bold">{{ txn.booking_number }}</td>
                <td class="py-2 small">{{ txn.customer?.name || 'Unknown' }}</td>
                <td class="py-2 small fw-bold text-end" [ngClass]="txn.payment_method === 'cash' ? 'text-success' : 'text-primary'">{{ txn.initial_payment_received | currency:'INR':'symbol' }}</td>
              </tr>
              <tr *ngIf="data.transactions.length === 0">
                <td colspan="4" class="text-center text-secondary py-4">No payment history found yet.</td>
              </tr>
            </tbody>
            <tfoot *ngIf="data.transactions.length > 0">
              <tr>
                <th colspan="3" class="text-end py-3 text-secondary">Total Collected:</th>
                <th class="text-end py-3 fw-bold fs-5" [ngClass]="data.title === 'Cash Payments' ? 'text-success' : 'text-primary'">{{ data.total | currency:'INR':'symbol' }}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="text-end mt-3">
          <button class="btn btn-light" mat-dialog-close>Close</button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .bg-light { background-color: #f8f9fa !important; }
    .sticky-top { z-index: 10; }
  `]
})
export class BankDetailsComponent implements OnInit {
  private bankService = inject(BankDetailService);
  private bookingService = inject(BookingService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild('historyDialog') historyDialogTemplate!: TemplateRef<any>;

  isLoading = signal(true);
  bankDetails = signal<BankDetail[]>([]);
  bookings = signal<Booking[]>([]);

  showForm = false;
  isEditing = false;
  currentBank: Partial<BankDetail> = {};

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    forkJoin({
      banks: this.bankService.getAll(),
      bookings: this.bookingService.getAll()
    }).subscribe({
      next: (data) => {
        this.bankDetails.set(data.banks);
        this.bookings.set(data.bookings);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadBankDetails() {
    this.bankService.getAll().subscribe(data => this.bankDetails.set(data));
  }

  loadBookings() {
    this.bookingService.getAll().subscribe(data => this.bookings.set(data));
  }

  getBankTotal(bankId: string | undefined): number {
    if (!bankId) return 0;
    return this.bookings()
      .filter(b => b.payment_method === 'bank' &&
        ((b.bank_detail as any)?._id === bankId || b.bank_detail === bankId || (b.bank_detail as any)?.id === bankId))
      .reduce((sum, b) => sum + (b.initial_payment_received || 0), 0);
  }

  getCashTotal(): number {
    return this.bookings()
      .filter(b => b.payment_method === 'cash')
      .reduce((sum, b) => sum + (b.initial_payment_received || 0), 0);
  }

  openHistory(type: 'cash' | 'bank', bank?: BankDetail) {
    let txns: Booking[] = [];
    let title = '';
    let total = 0;

    if (type === 'cash') {
      txns = this.bookings().filter(b => b.payment_method === 'cash' && (b.initial_payment_received || 0) > 0);
      title = 'Cash Payments';
      total = this.getCashTotal();
    } else if (bank) {
      const bankId = bank._id || bank.id;
      txns = this.bookings().filter(b => b.payment_method === 'bank' &&
        ((b.bank_detail as any)?._id === bankId || b.bank_detail === bankId || (b.bank_detail as any)?.id === bankId) &&
        (b.initial_payment_received || 0) > 0);
      title = bank.bank_name;
      total = this.getBankTotal(bankId);
    }

    // Sort descending (latest first)
    txns.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    this.dialog.open(this.historyDialogTemplate, {
      data: { title, transactions: txns, total },
      width: '600px',
      maxWidth: '95vw',
      panelClass: ['p-0']
    });
  }

  resetForm() {
    this.isEditing = false;
    this.currentBank = {
      account_holder: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      is_default: this.bankDetails().length === 0
    };
  }

  editBank(bank: BankDetail) {
    this.isEditing = true;
    this.showForm = true;
    this.currentBank = { ...bank };
  }

  saveBank() {
    if (this.isEditing) {
      this.bankService.update(this.currentBank as BankDetail).subscribe(() => {
        this.loadBankDetails();
        this.showForm = false;
      });
    } else {
      this.bankService.add(this.currentBank as BankDetail).subscribe(() => {
        this.loadBankDetails();
        this.showForm = false;
      });
    }
  }

  deleteBank(bank: BankDetail) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this bank account?', 'Confirm Delete', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.bankService.delete((bank._id || bank.id)!).subscribe(() => {
        this.loadBankDetails();
      });
    });
  }
}

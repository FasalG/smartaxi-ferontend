import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Booking, Customer, RentalItem, BankDetail } from '../../../../models/rental.models';
import { BankDetailService } from '../../../../services/bank-detail.service';
import { BookingService } from '../../../../services/booking.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-booking-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="dialog-header d-flex align-items-center justify-content-between p-2 p-md-4 pb-1 pb-md-2">
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Booking' : 'Create New Booking' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary" [disabled]="isSaving()">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #bookingForm="ngForm" class="row g-2 g-md-4">
        <!-- Customer & Item -->
        <div class="col-12">
          <label class="form-label small fw-bold text-secondary mb-1">Customer Selection</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="customer" [(ngModel)]="currentBooking.customer" required placeholder="Select a customer">
              <mat-option *ngFor="let cus of data.customers" [value]="cus._id || cus.id">
                <div class="d-flex flex-column">
                  <span class="fw-medium">{{ cus.name }}</span>
                  <span class="smaller text-secondary">{{ cus.email }}</span>
                </div>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Dates -->
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Start Date</label>
          <mat-form-field appearance="outline" class="w-100" (click)="startPicker.open()">
            <input matInput [matDatepicker]="startPicker" name="start_date" [(ngModel)]="currentBooking.start_date" required (ngModelChange)="onDateChange()" placeholder="Choose a date">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker yPosition="below" panelClass="bg-white-datepicker"></mat-datepicker>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">End Date</label>
          <mat-form-field appearance="outline" class="w-100" (click)="endPicker.open()">
            <input matInput [matDatepicker]="endPicker" name="end_date" [(ngModel)]="currentBooking.end_date" required (ngModelChange)="onDateChange()" placeholder="Choose a date">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker yPosition="below" panelClass="bg-white-datepicker"></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold text-secondary d-flex justify-content-between align-items-center mb-2">
            <span>Equipment / Items</span>
            <button type="button" class="btn btn-sm btn-outline-primary py-0" style="font-size: 0.75rem" (click)="addItemRow()" [disabled]="!datesValid()">
              + Add Item
            </button>
          </label>
          
          <div *ngIf="!datesValid()" class="alert alert-warning py-2 small mb-2 d-flex align-items-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Please select valid Start and End Dates first to view available items.
          </div>

          <div *ngIf="datesValid()">
            <div *ngFor="let row of itemRows; let i = index" class="d-flex flex-wrap gap-2 mb-2 p-2 border rounded bg-light align-items-center position-relative">
              
              <mat-form-field appearance="outline" class="flex-grow-1 mb-0" style="min-width: 200px;">
                <mat-label>Select Item</mat-label>
                <mat-select [(ngModel)]="row.item" name="item_{{i}}" (ngModelChange)="onItemSelect(i)" required>
                  <mat-option *ngFor="let item of data.items" [value]="item._id || item.id" [disabled]="isItemAlreadySelected(item, i)">
                    <div class="d-flex justify-content-between w-100 align-items-center">
                      <span>{{ item.name }}</span>
                      <span class="badge bg-secondary-subtle text-secondary smaller" *ngIf="getItemAvailability(item) !== null">
                        {{ getDisplayAvailability(item) }}
                      </span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="mb-0" style="width: 100px;">
                <mat-label>Qty</mat-label>
                <input matInput type="number" min="1" [max]="getMaxQty(row)" [(ngModel)]="row.quantity" name="qty_{{i}}" (ngModelChange)="calculateAmount(); checkAvailability()" required [disabled]="!row.item">
              </mat-form-field>

              <div class="d-flex flex-column justify-content-center" style="min-width: 80px;">
                <span class="small text-secondary fw-semibold">₹ {{ (row.rate * row.quantity * (currentBooking.duration_days || 1)) || 0 }}</span>
              </div>

              <button type="button" class="btn btn-sm text-danger" (click)="removeItemRow(i)" *ngIf="itemRows.length > 1">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>

          <div *ngIf="availabilityErrors().length > 0" class="mt-2 px-1">
            <div *ngFor="let error of availabilityErrors()" class="text-danger smaller d-flex align-items-center gap-1 mb-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {{ error }}
            </div>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Payment Method</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="payment_method" [(ngModel)]="currentBooking.payment_method" required>
              <mat-option value="none">None / Later</mat-option>
              <mat-option value="cash">Cash Payment</mat-option>
              <mat-option value="bank">Bank Transfer</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6" *ngIf="currentBooking.payment_method === 'bank'">
          <label class="form-label small fw-bold text-secondary mb-1">Bank Account</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="bank_detail" [(ngModel)]="currentBooking.bank_detail">
              <mat-option *ngFor="let bank of bankDetails()" [value]="bank._id || bank.id">
                {{ bank.bank_name }} ({{ bank.account_number }})
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Initial Payment Received</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="initial_payment_received" [(ngModel)]="currentBooking.initial_payment_received">
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Total Fee (Calculated)</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="amount" [(ngModel)]="currentBooking.amount" required>
            <span matSuffix class="text-secondary small pe-2">{{ currentBooking.duration_days }} Days</span>
          </mat-form-field>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold text-secondary mb-1">Reservation Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="status" [(ngModel)]="currentBooking.status" required>
              <mat-option value="pending">Pending</mat-option>
              <mat-option value="active">Active (Rented Out)</mat-option>
              <mat-option value="cancelled">Cancelled</mat-option>
              <mat-option value="closed">Closed (Returned)</mat-option>
            </mat-select>
          </mat-form-field>
          <p class="smaller text-muted mt-n2">Tip: Manual status overrides are supported. 'Active' implies the item is currently with the customer.</p>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()" [disabled]="isSaving()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0 d-flex align-items-center justify-content-center" [disabled]="!bookingForm.valid || !itemRowsValid() || availabilityErrors().length > 0 || isSaving()" (click)="onSave()">
        <span *ngIf="isSaving()" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        {{ isSaving() ? 'Saving...' : (data.isEditing ? 'Update Reservation' : 'Confirm & Save') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      width: 750px;
      max-width: 95vw;
      max-height: 90vh;
    }
    mat-dialog-content {
      flex: 1 1 auto;
      overflow-y: auto;
    }
    .smaller { font-size: 0.75rem; }
    
    ::ng-deep .bg-white-datepicker {
      background-color: #ffffff !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }
    ::ng-deep .bg-white-datepicker .mat-calendar {
      background-color: #ffffff !important;
      border-radius: 8px !important;
    }
    ::ng-deep .mat-datepicker-content, ::ng-deep .mat-calendar-content {
      background-color: #ffffff !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      padding: 0 !important;
    }
    @media (max-width: 768px) {
      .dialog-header h2 {
        font-size: 1.15rem;
      }
      mat-dialog-content {
        max-height: calc(95vh - 120px) !important;
        padding: 12px 10px !important;
      }
      .dialog-actions-mobile {
        flex-direction: column-reverse;
        padding: 12px 10px !important;
      }
      .dialog-actions-mobile button {
        width: 100%;
        margin: 0 !important;
      }
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #e0e0e0;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #bdbdbd;
    }
  `]
})
export class BookingFormDialogComponent implements OnInit {
  public data = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<BookingFormDialogComponent>);
  private bankService = inject(BankDetailService);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);

  currentBooking: Partial<Booking>;
  itemRows: { item: string, quantity: number, rate: number }[] = [];
  bankDetails = signal<BankDetail[]>([]);
  availabilityErrors = signal<string[]>([]);
  isSaving = signal(false);

  constructor() {
    this.currentBooking = { ...this.data.booking };

    // Fix object references for UI bindings
    if (this.currentBooking.customer && typeof this.currentBooking.customer === 'object') {
      const cusAny = this.currentBooking.customer as any;
      this.currentBooking.customer = cusAny._id || cusAny.id || cusAny;
    }

    if (this.currentBooking.bank_detail && typeof this.currentBooking.bank_detail === 'object') {
      const bankAny = this.currentBooking.bank_detail as any;
      this.currentBooking.bank_detail = bankAny._id || bankAny.id || bankAny;
    }

    // Format dates for input[type="date"]
    if (this.currentBooking.start_date) {
      const sdAny = this.currentBooking.start_date as any;
      if (typeof sdAny === 'string' && sdAny.includes('T')) {
        this.currentBooking.start_date = sdAny.split('T')[0];
      } else if (sdAny instanceof Date) {
        this.currentBooking.start_date = sdAny.toISOString().split('T')[0];
      }
    }

    if (this.currentBooking.end_date) {
      const edAny = this.currentBooking.end_date as any;
      if (typeof edAny === 'string' && edAny.includes('T')) {
        this.currentBooking.end_date = edAny.split('T')[0];
      } else if (edAny instanceof Date) {
        this.currentBooking.end_date = edAny.toISOString().split('T')[0];
      }
    }

    if (this.currentBooking.items && this.currentBooking.items.length > 0) {
      this.itemRows = this.currentBooking.items.map(i => {
        const itemAny = i.item as any;
        return {
          item: itemAny?._id || itemAny?.id || itemAny,
          quantity: i.quantity || 1,
          rate: i.rate || 0
        };
      });
    } else {
      // Add one empty row by default if not editing
      if (!this.data.isEditing) {
        this.addItemRow();
      }
    }
  }

  ngOnInit() {
    this.bankService.getAll().subscribe(data => {
      this.bankDetails.set(data);
      if (!this.currentBooking.bank_detail && data.length > 0) {
        const defaultBank = data.find(b => b.is_default);
        if (defaultBank) {
          this.currentBooking.bank_detail = defaultBank._id || defaultBank.id;
        }
      }
    });

    if (!this.data.isEditing) {
      this.currentBooking.start_date = undefined;
      this.currentBooking.end_date = undefined;
    }

    // Auto-detect status for new bookings if not already set
    if (!this.data.isEditing) {
      this.detectInitialStatus();
    }
    this.checkAvailability();
  }

  detectInitialStatus() {
    if (!this.currentBooking.start_date) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(this.currentBooking.start_date as string);
    start.setHours(0, 0, 0, 0);

    if (start.getTime() <= now.getTime()) {
      this.currentBooking.status = 'active';
    } else {
      this.currentBooking.status = 'pending';
    }
  }

  onDateChange() {
    this.detectInitialStatus();

    // Check if dates are selected
    if (this.datesValid()) {
      // Reset item array if dates change to force re-selection and re-calculation based on new dates
      this.itemRows = [];
      this.addItemRow();
      this.calculateAmount();
      this.checkAvailability();
    }
  }

  datesValid(): boolean {
    return !!(this.currentBooking.start_date && this.currentBooking.end_date);
  }

  itemRowsValid(): boolean {
    if (!this.datesValid()) return false;
    if (this.itemRows.length === 0) return false;
    for (const row of this.itemRows) {
      if (!row.item || !row.quantity || row.quantity < 1) return false;
    }
    return true;
  }

  addItemRow() {
    this.itemRows.push({ item: '', quantity: 1, rate: 0 });
  }

  removeItemRow(index: number) {
    this.itemRows.splice(index, 1);
    this.calculateAmount();
    this.checkAvailability();
  }

  onItemSelect(index: number) {
    const row = this.itemRows[index];
    if (row.item) {
      const itemData = this.data.items.find((i: RentalItem) => (i._id || i.id) === row.item);
      if (itemData) {
        row.rate = itemData.daily_rate;

        // Auto cap quantity if requested > available
        const avail = this.getItemAvailability(itemData);
        if (avail !== null && row.quantity > avail) {
          row.quantity = Math.max(1, avail); // Fallback to 1 if 0, checkAvailability will catch the 0
        }
      }
    }
    this.calculateAmount();
    this.checkAvailability();
  }

  isItemAlreadySelected(item: any, currentIndex: number): boolean {
    const itemId = item._id || item.id;
    return this.itemRows.some((row, idx) => idx !== currentIndex && row.item === itemId);
  }

  getMaxQty(row: any): number {
    if (!row.item) return 1;
    const itemData = this.data.items.find((i: RentalItem) => (i._id || i.id) === row.item);
    if (!itemData) return 1;
    const avail = this.getItemAvailability(itemData);
    return avail !== null ? avail : itemData.total_quantity;
  }

  getItemAvailability(item: any): number | null {
    if (!this.datesValid()) return null;

    const startVal = this.currentBooking.start_date as any;
    const endVal = this.currentBooking.end_date as any;

    if (!startVal || !endVal) return null;

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const allBookings = this.data.bookings || [];
    const itemId = item._id || item.id;

    const overlappingBookings = allBookings.filter((b: any) => {
      if (this.currentBooking._id && b._id === this.currentBooking._id) return false;
      if (this.currentBooking.id && b.id === this.currentBooking.id) return false;
      if (!['active', 'pending', 'confirmed'].includes(b.status)) return false;

      const bStart = new Date(b.start_date as string);
      const bEnd = new Date(b.end_date as string);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(23, 59, 59, 999);

      return bStart.getTime() <= end.getTime() && bEnd.getTime() >= start.getTime();
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

    return Math.max(0, item.total_quantity - rentedQuantity);
  }

  getDisplayAvailability(item: any): string {
    const avail = this.getItemAvailability(item);
    if (avail === null) return '';
    return avail > 0 ? `${avail} avail` : 'Out';
  }

  checkAvailability() {
    this.availabilityErrors.set([]);
    if (!this.datesValid()) return;

    const errors: string[] = [];

    this.itemRows.forEach(row => {
      if (!row.item) return;
      const item = this.data.items.find((i: any) => (i._id || i.id) === row.item);
      if (!item) return;

      const availableQuantity = this.getItemAvailability(item) || 0;
      const requestedQuantity = row.quantity || 1;

      if (availableQuantity < requestedQuantity) {
        errors.push(`'${item.name}' is out of stock for the selected dates (Available: ${availableQuantity}, Requested: ${requestedQuantity}).`);
      }
    });

    this.availabilityErrors.set(errors);
  }

  calculateAmount() {
    if (this.currentBooking.start_date && this.currentBooking.end_date) {
      const start = new Date(this.currentBooking.start_date as string);
      const end = new Date(this.currentBooking.end_date as string);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      this.currentBooking.duration_days = diffDays;
    }

    if (this.itemRows.length > 0 && this.currentBooking.duration_days) {
      const totalDailyRate = this.itemRows.reduce((sum, row) => sum + (row.rate * (row.quantity || 1)), 0);
      this.currentBooking.amount = totalDailyRate * this.currentBooking.duration_days;
    }

    // Sync itemRows back to booking object
    this.currentBooking.items = this.itemRows.filter(r => r.item).map(r => ({ ...r }));
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.isSaving.set(true);

    // Ensure numeric fields
    this.currentBooking.amount = Number(this.currentBooking.amount) || 0;
    this.currentBooking.initial_payment_received = Number(this.currentBooking.initial_payment_received) || 0;

    if (this.data.isEditing) {
      this.bookingService.update(this.currentBooking as Booking).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving.set(false);
        }
      });
    } else {
      const newBooking = {
        ...this.currentBooking,
        booking_number: this.bookingService.generateCode('BOK'),
        created_at: new Date().toISOString()
      } as Booking;

      this.bookingService.add(newBooking).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving.set(false);
        }
      });
    }
  }
}

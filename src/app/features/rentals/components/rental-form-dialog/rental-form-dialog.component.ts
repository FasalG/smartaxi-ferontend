import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Rental, Customer, RentalItem } from '../../../../models/rental.models';
import { CustomerService } from '../../../../services/customer.service';
import { InventoryService } from '../../../../services/inventory.service';

@Component({
  selector: 'app-rental-form-dialog',
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
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Rental Contract' : 'New Rental Assignment' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #rentalForm="ngForm" class="row g-2 g-md-4 pt-1 pt-md-2">
        <div class="col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Customer Selection</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="customer" [(ngModel)]="currentRental.customer" required placeholder="Select a customer">
              <mat-option *ngFor="let cus of customers" [value]="cus._id || cus.id">
                {{ cus.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Equipment / Item</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="item" [(ngModel)]="currentRental.item" required (selectionChange)="calculateTotal()" placeholder="Select an item">
              <mat-option *ngFor="let item of items" [value]="item._id || item.id">
                <div class="d-flex justify-content-between w-100">
                  <span>{{ item.name }}</span>
                  <span class="text-secondary smaller">{{ item.available_quantity }} units</span>
                </div>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Starting Date</label>
           <mat-form-field appearance="outline" class="w-100">
            <input matInput [matDatepicker]="startPicker" name="start_date" [(ngModel)]="currentRental.start_date" required>
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Expected Return Date</label>
           <mat-form-field appearance="outline" class="w-100">
            <input matInput [matDatepicker]="duePicker" name="due_date" [(ngModel)]="currentRental.due_date" required>
            <mat-datepicker-toggle matIconSuffix [for]="duePicker"></mat-datepicker-toggle>
            <mat-datepicker #duePicker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">Duration (Days)</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput type="number" name="duration_days" [(ngModel)]="currentRental.duration_days" required (change)="calculateTotal()" placeholder="0">
            <span matSuffix class="text-secondary small pe-2">Days</span>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">Total Rental Fee</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="total_amount" [(ngModel)]="currentRental.total_amount" required>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">Initial Deposit</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="paid_amount" [(ngModel)]="currentRental.paid_amount" placeholder="0.00">
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Lease Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="status" [(ngModel)]="currentRental.status" required>
              <mat-option value="active">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-primary"></span> Active
                </span>
              </mat-option>
              <mat-option value="overdue">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-danger"></span> Overdue
                </span>
              </mat-option>
              <mat-option value="returned">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-success"></span> Returned
                </span>
              </mat-option>
              <mat-option value="extended">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-info"></span> Extended
                </span>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Payment Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="payment_status" [(ngModel)]="currentRental.payment_status" required>
              <mat-option value="paid">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-success"></span> Fully Paid
                </span>
              </mat-option>
              <mat-option value="partial">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-warning"></span> Partial Payment
                </span>
              </mat-option>
              <mat-option value="unpaid">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-danger"></span> Unpaid
                </span>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0" [disabled]="!rentalForm.valid" (click)="onSave()">
        {{ data.isEditing ? 'Update Contract' : 'Create Rental' }}
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
      width: 800px;
      max-width: 95vw;
      max-height: 90vh;
    }
    mat-dialog-content {
      flex: 1 1 auto;
      overflow-y: auto;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
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
    
    /* Optional sleek scrollbar */
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
export class RentalFormDialogComponent implements OnInit {
  currentRental: Partial<Rental>;
  customers: Customer[] = [];
  items: RentalItem[] = [];

  public data = inject(MAT_DIALOG_DATA);

  constructor(
    public dialogRef: MatDialogRef<RentalFormDialogComponent>,
    private customerService: CustomerService,
    private inventoryService: InventoryService
  ) {
    this.currentRental = { ...this.data.rental };
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadItems();
  }

  loadCustomers() {
    this.customerService.getAll().subscribe(data => this.customers = data);
  }

  loadItems() {
    this.inventoryService.getAll().subscribe(data => this.items = data);
  }

  calculateTotal() {
    const item = this.items.find(i => (i._id || i.id) === this.currentRental.item);
    if (item && this.currentRental.duration_days) {
      this.currentRental.total_amount = item.daily_rate * this.currentRental.duration_days;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    // Convert dates back to string if necessary, though MatDatepicker might return Date objects
    if (this.currentRental.start_date && (this.currentRental.start_date as any) instanceof Date) {
      this.currentRental.start_date = (this.currentRental.start_date as any).toISOString().split('T')[0];
    }
    if (this.currentRental.due_date && (this.currentRental.due_date as any) instanceof Date) {
      this.currentRental.due_date = (this.currentRental.due_date as any).toISOString().split('T')[0];
    }
    this.dialogRef.close(this.currentRental);
  }
}

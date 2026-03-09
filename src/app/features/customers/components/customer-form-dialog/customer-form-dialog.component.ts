import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Customer } from '../../../../models/rental.models';

@Component({
  selector: 'app-customer-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="dialog-header d-flex align-items-center justify-content-between p-2 p-md-4 pb-1 pb-md-2">
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Customer' : 'Add New Customer' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #customerForm="ngForm" class="row g-2 g-md-4 pt-1 pt-md-2">
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Full Name</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="name" [(ngModel)]="currentCustomer.name" required placeholder="Enter customer name">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Company (Optional)</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="company" [(ngModel)]="currentCustomer.company" placeholder="Company name">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Email Address</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput type="email" name="email" [(ngModel)]="currentCustomer.email" required placeholder="email@example.com">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Phone Number</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="phone" [(ngModel)]="currentCustomer.phone" required placeholder="+1 (555) 000-0000">
          </mat-form-field>
        </div>
        <div class="col-12">
          <label class="form-label small fw-bold text-secondary mb-1">Detailed Address</label>
          <mat-form-field appearance="outline" class="w-100">
            <textarea matInput name="address" [(ngModel)]="currentCustomer.address" rows="2" placeholder="Street address, apartment, etc."></textarea>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">City</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="city" [(ngModel)]="currentCustomer.city" placeholder="City">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">State / Province</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="state" [(ngModel)]="currentCustomer.state" placeholder="State">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label small fw-bold text-secondary mb-1">Country</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="country" [(ngModel)]="currentCustomer.country" required placeholder="Country">
          </mat-form-field>
        </div>
        
        <div class="col-12 col-md-6">
          <div class="card bg-light border-0 p-3 mt-1">
            <div class="form-check form-switch d-flex align-items-center gap-2 p-0 m-0">
              <input class="form-check-input ms-0" type="checkbox" name="gst_registered" id="gstSwitch" [(ngModel)]="currentCustomer.gst_registered">
              <label class="form-check-label small fw-bold text-dark" for="gstSwitch">GST Registered Business</label>
            </div>
          </div>
        </div>
        
        <div class="col-12 col-md-6" *ngIf="currentCustomer.gst_registered">
          <label class="form-label small fw-bold text-secondary mb-1">GST Number</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="gst_number" [(ngModel)]="currentCustomer.gst_number" placeholder="Enter GSTIN">
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Account Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="status" [(ngModel)]="currentCustomer.status" required>
              <mat-option value="active">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-success"></span> Active
                </span>
              </mat-option>
              <mat-option value="inactive">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-secondary"></span> Inactive
                </span>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0" [disabled]="!customerForm.valid" (click)="onSave()">
        {{ data.isEditing ? 'Update Profile' : 'Create Customer' }}
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
export class CustomerFormDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<CustomerFormDialogComponent>);

  currentCustomer: Partial<Customer>;

  constructor() {
    this.currentCustomer = { ...this.data.customer };
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.dialogRef.close(this.currentCustomer);
  }
}

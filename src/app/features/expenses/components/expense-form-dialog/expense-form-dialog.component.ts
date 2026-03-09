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
import { Expense } from '../../../../models/rental.models';

@Component({
  selector: 'app-expense-form-dialog',
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
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Expense Record' : 'Record New Expense' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #expenseForm="ngForm" class="row g-2 g-md-4 pt-1 pt-md-2">
        <div class="col-12 col-md-7">
          <label class="form-label small fw-bold text-secondary mb-1">Payee / Vendor</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="vendor" [(ngModel)]="currentExpense.vendor" required placeholder="Who was paid?">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-5">
          <label class="form-label small fw-bold text-secondary mb-1">Transaction Date</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput [matDatepicker]="picker" name="expense_date" [(ngModel)]="expenseDate" required>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>
        
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Expense Category</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="category" [(ngModel)]="currentExpense.category" required placeholder="Select category">
              <mat-option *ngFor="let cat of data.categories" [value]="cat.toLowerCase()">
                {{ cat }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Amount Paid</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="amount" [(ngModel)]="currentExpense.amount" required>
          </mat-form-field>
        </div>

        <div class="col-md-12">
          <label class="form-label small fw-bold text-secondary mb-1">Settlement Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="status" [(ngModel)]="currentExpense.status" required>
              <mat-option value="pending">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-warning"></span> Pending Approval
                </span>
              </mat-option>
              <mat-option value="approved">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-info"></span> Approved
                </span>
              </mat-option>
              <mat-option value="paid">
                <span class="d-flex align-items-center gap-2">
                  <span class="dot bg-success"></span> Paid & Settled
                </span>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold text-secondary mb-1">Expense Details</label>
          <mat-form-field appearance="outline" class="w-100">
            <textarea matInput name="description" [(ngModel)]="currentExpense.description" rows="3" required placeholder="What was this expense for?"></textarea>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0" [disabled]="!expenseForm.valid" (click)="onSave()">
        {{ data.isEditing ? 'Update Expense' : 'Save Expense' }}
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
      width: 650px;
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
export class ExpenseFormDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<ExpenseFormDialogComponent>);

  currentExpense: Partial<Expense>;
  expenseDate = new Date();

  constructor() {
    this.currentExpense = { ...this.data.expense };
    if (this.currentExpense.expense_date) {
      this.expenseDate = new Date(this.currentExpense.expense_date);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.currentExpense.expense_date = this.expenseDate.toISOString().split('T')[0];
    this.dialogRef.close(this.currentExpense);
  }
}

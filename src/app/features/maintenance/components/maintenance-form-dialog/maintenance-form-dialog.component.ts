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
import { Maintenance, RentalItem } from '../../../../models/rental.models';

@Component({
  selector: 'app-maintenance-form-dialog',
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
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Maintenance Task' : 'Schedule New Maintenance' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #maintenanceForm="ngForm" class="row g-2 g-md-4 pt-1 pt-md-2">
        <div class="col-12 col-md-7">
          <label class="form-label small fw-bold text-secondary mb-1">Equipment to Service</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="item" [(ngModel)]="currentRecord.item" required placeholder="Select inventory item">
              <mat-option *ngFor="let item of data.items" [value]="item._id || item.id">
                <div class="d-flex justify-content-between w-100">
                  <span>{{ item.name }}</span>
                  <span class="text-secondary smaller">{{ item.sku }}</span>
                </div>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-5">
          <label class="form-label small fw-bold text-secondary mb-1">Schedule Date</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput [matDatepicker]="picker" name="scheduled_date" [(ngModel)]="scheduledDate" required>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Assigned Technician / Shop</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="technician" [(ngModel)]="currentRecord.technician" required placeholder="Name of technician">
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Estimated Cost</label>
          <mat-form-field appearance="outline" class="w-100">
            <span matPrefix class="text-secondary pe-1">₹</span>
            <input matInput type="number" name="cost" [(ngModel)]="currentRecord.cost" required placeholder="0.00">
          </mat-form-field>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Task Priority</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="priority" [(ngModel)]="currentRecord.priority" required>
              <mat-option value="low">Low Priority</mat-option>
              <mat-option value="medium">Medium Priority</mat-option>
              <mat-option value="high">High Priority</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label small fw-bold text-secondary mb-1">Job Status</label>
          <mat-form-field appearance="outline" class="w-100">
            <mat-select name="status" [(ngModel)]="currentRecord.status" required>
              <mat-option value="scheduled">Scheduled</mat-option>
              <mat-option value="in_progress">In Progress</mat-option>
              <mat-option value="completed">Completed</mat-option>
              <mat-option value="overdue">Overdue</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold text-secondary mb-1">Work Description & Notes</label>
          <mat-form-field appearance="outline" class="w-100">
            <textarea matInput name="description" [(ngModel)]="currentRecord.description" rows="3" required placeholder="Detailed notes about the maintenance work..."></textarea>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0" [disabled]="!maintenanceForm.valid" (click)="onSave()">
        {{ data.isEditing ? 'Update Schedule' : 'Confirm Schedule' }}
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
export class MaintenanceFormDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<MaintenanceFormDialogComponent>);

  currentRecord: Partial<Maintenance>;
  scheduledDate = new Date();

  constructor() {
    this.currentRecord = { ...this.data.record };
    if (this.currentRecord.scheduled_date) {
      this.scheduledDate = new Date(this.currentRecord.scheduled_date);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.currentRecord.scheduled_date = this.scheduledDate.toISOString().split('T')[0];
    this.dialogRef.close(this.currentRecord);
  }
}

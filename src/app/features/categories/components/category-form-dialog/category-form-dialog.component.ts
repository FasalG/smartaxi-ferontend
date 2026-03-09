import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Category } from '../../../../models/rental.models';

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="dialog-header d-flex align-items-center justify-content-between p-2 p-md-4 pb-1 pb-md-2">
      <h2 class="h5 fw-bold mb-0">{{ data.isEditing ? 'Edit Category' : 'Create New Category' }}</h2>
      <button mat-icon-button (click)="onCancel()" class="text-secondary">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <mat-dialog-content class="px-2 px-md-4 py-2 custom-scrollbar">
      <form #categoryForm="ngForm" class="pt-1 pt-md-2">
        <div class="mb-4">
          <label class="form-label small fw-bold text-secondary mb-1">Category Name</label>
          <mat-form-field appearance="outline" class="w-100">
            <input matInput name="name" [(ngModel)]="currentCategory.name" required placeholder="Ex: Heavy Machinery">
          </mat-form-field>
        </div>
        <div>
          <label class="form-label small fw-bold text-secondary mb-1">Category Description</label>
          <mat-form-field appearance="outline" class="w-100">
            <textarea matInput name="description" [(ngModel)]="currentCategory.description" rows="4" placeholder="Briefly describe the equipment type..."></textarea>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="px-2 px-md-4 py-2 py-md-3 d-flex flex-wrap justify-content-end gap-2 border-top dialog-actions-mobile">
      <button class="btn btn-light px-4 fw-semibold flex-grow-1 flex-md-grow-0" (click)="onCancel()">Discard</button>
      <button class="btn btn-primary px-4 fw-semibold shadow-sm flex-grow-1 flex-md-grow-0" [disabled]="!categoryForm.valid" (click)="onSave()">
        {{ data.isEditing ? 'Update Category' : 'Save Category' }}
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
      width: 450px;
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
export class CategoryFormDialogComponent {
  public data = inject(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef<CategoryFormDialogComponent>);

  currentCategory: Partial<Category>;

  constructor() {
    this.currentCategory = { ...this.data.category };
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    this.dialogRef.close(this.currentCategory);
  }
}

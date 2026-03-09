import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaintenanceService } from '../../services/maintenance.service';
import { InventoryService } from '../../services/inventory.service';
import { Maintenance, RentalItem } from '../../models/rental.models';
import { MaintenanceFormDialogComponent } from '../../features/maintenance/components/maintenance-form-dialog/maintenance-form-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Equipment Maintenance</h2>
          <p class="text-secondary mb-0">Track and schedule equipment maintenance</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openRecordDialog()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Schedule Maintenance
        </button>
      </div>

      <!-- Alert for overdue -->
      <div *ngIf="overdueCount() > 0" class="alert alert-danger border-0 shadow-sm d-flex align-items-start gap-3 mb-4" role="alert">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mt-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 class="h6 fw-bold mb-1">Overdue Maintenance</h4>
          <p class="small mb-0">
            {{ overdueCount() }} maintenance task{{ overdueCount() > 1 ? 's' : '' }} {{ overdueCount() > 1 ? 'are' : 'is' }} overdue. Please address immediately.
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Scheduled</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ scheduledCount() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">In Progress</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-warning-emphasis mb-0 text-truncate">{{ inProgressCount() }}</p>
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
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Cost (MTD)</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-success mb-0 text-truncate">{{ totalCost() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
      </div>

      <!-- Maintenance Records Table -->
      <div class="card shadow-sm border-0 overflow-hidden mb-4">
        <!-- Loader -->
        <div class="card-body text-center py-5" *ngIf="isLoading()">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2 text-secondary small">Loading maintenance records...</div>
        </div>

        <div class="table-responsive" *ngIf="!isLoading()">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light text-secondary small text-uppercase fw-medium">
              <tr>
                <th class="px-4 py-3 border-0">Item</th>
                <th class="px-4 py-3 border-0">Type/Priority</th>
                <th class="px-4 py-3 border-0">Description</th>
                <th class="px-4 py-3 border-0">Scheduled</th>
                <th class="px-4 py-3 border-0">Technician</th>
                <th class="px-4 py-3 border-0 text-end">Cost</th>
                <th class="px-4 py-3 border-0 text-center">Status</th>
                <th class="px-4 py-3 border-0 text-end">Actions</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              <tr *ngFor="let record of records()" class="hover-bg-light">
                <td class="px-4 py-3 small fw-bold text-dark">{{ getItemName(record.item) }}</td>
                <td class="px-4 py-3">
                   <div class="d-flex flex-column gap-1">
                      <span [class]="getPriorityClass(record.priority)">{{ record.priority | titlecase }}</span>
                   </div>
                </td>
                <td class="px-4 py-3 small text-secondary text-truncate" style="max-width: 200px;">
                  {{ record.description }}
                </td>
                <td class="px-4 py-3 small text-secondary">{{ record.scheduled_date }}</td>
                <td class="px-4 py-3 small text-secondary">{{ record.technician }}</td>
                <td class="px-4 py-3 small fw-bold text-dark text-end">{{ record.cost | currency:'INR':'symbol' }}</td>
                <td class="px-4 py-3 text-center">
                  <span [class]="getStatusClass(record.status)">
                    {{ record.status | titlecase }}
                  </span>
                </td>
                <td class="px-4 py-3 text-end">
                  <div class="d-flex align-items-center justify-content-end gap-1">
                    <button class="btn btn-sm btn-link p-1 text-primary" (click)="openRecordDialog(record)">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-link p-1 text-danger" (click)="deleteRecord((record._id || record._id)!)">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hover-bg-light:hover { background-color: var(--bs-light); }
  `]
})
export class MaintenanceComponent implements OnInit {
  isLoading = signal(true);
  records = signal<Maintenance[]>([]);
  items = signal<RentalItem[]>([]);

  scheduledCount = computed(() => {
    return this.records().filter((r) => r.status === 'scheduled').length;
  });

  inProgressCount = computed(() => {
    return this.records().filter((r) => r.status === 'in_progress').length;
  });

  overdueCount = computed(() => {
    return this.records().filter((r) => r.status === 'overdue').length;
  });

  totalCost = computed(() => {
    return this.records().filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.cost, 0);
  });

  private maintenanceService = inject(MaintenanceService);
  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    forkJoin({
      records: this.maintenanceService.getAll(),
      items: this.inventoryService.getAll()
    }).subscribe({
      next: (data) => {
        this.records.set(data.records);
        this.items.set(data.items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadMaintenance() {
    this.maintenanceService.getAll().subscribe(data => this.records.set(data));
  }

  loadItems() {
    this.inventoryService.getAll().subscribe(data => this.items.set(data));
  }

  getEmptyRecord(): Partial<Maintenance> {
    return {
      item: '',
      description: '',
      priority: 'low',
      status: 'scheduled',
      cost: 0,
      technician: '',
      scheduled_date: new Date().toISOString().split('T')[0]
    };
  }

  getItemName(data?: any): string {
    if (!data) return 'Unknown Item';
    const id = typeof data === 'object' ? (data._id || data.id) : data;
    return this.items().find(i => (i._id || i.id) === id)?.name || 'Unknown Item';
  }

  getPriorityClass(priority: string): string {
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    switch (priority) {
      case 'high': return `₹{base} bg-danger-subtle text-danger border border-danger`;
      case 'medium': return `₹{base} bg-warning-subtle text-warning-emphasis border border-warning`;
      default: return `₹{base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  getStatusClass(status: string): string {
    const base = 'badge rounded-pill fw-normal px-3 py-2';
    switch (status) {
      case 'completed': return `₹{base} bg-success-subtle text-success border border-success`;
      case 'in_progress': return `₹{base} bg-primary-subtle text-primary border border-primary`;
      case 'overdue': return `₹{base} bg-danger text-white`;
      default: return `₹{base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  openRecordDialog(record?: Maintenance) {
    const dialogRef = this.dialog.open(MaintenanceFormDialogComponent, {
      data: {
        record: record ? { ...record } : this.getEmptyRecord(),
        isEditing: !!record,
        items: this.items()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (record) {
          this.maintenanceService.update(result as Maintenance).subscribe(() => this.loadMaintenance());
        } else {
          const newRec = {
            ...result,
            created_at: new Date().toISOString()
          } as Maintenance;
          this.maintenanceService.add(newRec).subscribe(() => this.loadMaintenance());
        }
      }
    });
  }

  deleteRecord(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this record?', 'Confirm Delete', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.maintenanceService.delete(id).subscribe(() => {
        this.loadMaintenance();
        this.snackBar.open('Maintenance record deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      });
    });
  }
}

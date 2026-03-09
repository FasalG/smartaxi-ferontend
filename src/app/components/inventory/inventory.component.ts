import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InventoryService } from '../../services/inventory.service';
import { CategoryService } from '../../services/category.service';
import { BookingService } from '../../services/booking.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { RentalItem, Category, Booking, Maintenance } from '../../models/rental.models';
import { InventoryFormDialogComponent } from '../../features/inventory/components/inventory-form-dialog/inventory-form-dialog.component';
import { ItemAvailabilityCalendarDialogComponent } from '../../shared/components/item-availability-calendar-dialog/item-availability-calendar-dialog.component';
import { ExcelService } from '../../services/excel.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, MatPaginatorModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Rental Inventory</h2>
          <p class="text-secondary mb-0">Live stock tracking based on rentals and maintenance</p>
        </div>
        <div class="d-flex gap-2">
          <div class="dropdown">
            <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 px-3 shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
              <li>
                <button class="dropdown-item d-flex align-items-center gap-2 py-2" (click)="exportToExcel()">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-success">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to Excel
                </button>
              </li>
              <li>
                <button class="dropdown-item d-flex align-items-center gap-2 py-2" (click)="downloadTemplate()">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-secondary">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <label class="dropdown-item d-flex align-items-center gap-2 py-2 cursor-pointer" [class.disabled]="isImporting()" style="cursor: pointer;">
                  <span *ngIf="isImporting()" class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
                  <svg *ngIf="!isImporting()" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-primary">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {{ isImporting() ? 'Importing...' : 'Import from Excel' }}
                  <input type="file" (change)="onFileUpload($event)" accept=".xlsx, .xls" style="display: none;" [disabled]="isImporting()">
                </label>
              </li>
            </ul>
          </div>
          <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openItemDialog()">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Pieces</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-dark mb-0 text-truncate">{{ totalItems() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Live Available</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-success mb-0 text-truncate">{{ availableItems() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">In Rental</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ rentedItems() }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">System Health</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-info mb-0 text-truncate">{{ utilizationRate() }}% Active</p>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="card shadow-sm border-0 p-4 mb-4">
        <div class="row g-3">
          <div class="col-12 col-md-8">
            <div class="input-group h-100">
              <span class="input-group-text bg-transparent border-end-0 text-secondary">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search equipment by name or SKU..."
                class="form-control border-start-0 ps-0"
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
              />
            </div>
          </div>
          <div class="col-12 col-md-4">
            <select
              class="form-select h-100"
              [ngModel]="categoryFilter()"
              (ngModelChange)="categoryFilter.set($event)"
            >
              <option value="all">All Categories</option>
              <option *ngFor="let cat of categories()" [value]="cat._id || cat.id">{{ cat.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="card shadow-sm border-0 overflow-hidden mb-4">
        <!-- Loader -->
        <div class="card-body text-center py-5" *ngIf="isLoading()">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2 text-secondary small">Loading inventory...</div>
        </div>

        <div class="table-responsive" *ngIf="!isLoading()">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light text-secondary small text-uppercase fw-medium">
              <tr>
                <th class="px-4 py-3 border-0">Equipment</th>
                <th class="px-4 py-3 border-0">SKU</th>
                <th class="px-4 py-3 border-0">Category</th>
                <th class="px-4 py-3 border-0">Stock</th>
                <th class="px-4 py-3 border-0">Availability</th>
                <th class="px-4 py-3 border-0">Rates (Day/Week)</th>
                <th class="px-4 py-3 border-0">Condition</th>
                <th class="px-4 py-3 border-0">Live Status</th>
                <th class="px-4 py-3 border-0 text-end">Actions</th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              <tr *ngFor="let item of paginatedItems()" class="hover-bg-light">
                <td class="px-4 py-3 small fw-medium text-dark">{{ item.name }}</td>
                <td class="px-4 py-3 small text-secondary">{{ item.sku }}</td>
                <td class="px-4 py-3 small text-secondary">{{ getCategoryName(item.category) }}</td>
                <td class="px-4 py-3">
                  <div class="small">
                    <span class="fw-medium text-dark">{{ getCalculatedAvailability(item) }}</span>
                    <span class="text-secondary"> / {{ item.total_quantity }} Available</span>
                  </div>
                  <div class="progress mt-1" style="height: 4px; width: 100px;">
                    <div
                      class="progress-bar"
                      [ngClass]="getProgressBarClass(item)"
                      role="progressbar"
                      [style.width.%]="(getCalculatedAvailability(item) / item.total_quantity) * 100"
                    ></div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <button class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" (click)="openCalendarDialog(item)">
                    <svg width="16" height="16" fill="none" class="text-primary" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Check Calendar
                  </button>
                </td>
                <td class="px-4 py-3 small fw-medium text-dark">
                  <div class="text-dark">{{ item.daily_rate | currency:'INR':'symbol' }}</div>
                  <div class="text-muted smaller">{{ item.weekly_rate | currency:'INR':'symbol' }}</div>
                </td>
                <td class="px-4 py-3">
                  <span [class]="getConditionClass(item.condition)">{{ item.condition }}</span>
                </td>
                <td class="px-4 py-3">
                  <span [class]="getCalculatedStatusClass(item)">{{ getCalculatedStatus(item) | titlecase }}</span>
                </td>
                <td class="px-4 py-3 text-end">
                  <div class="d-flex align-items-center justify-content-end gap-1">
                    <button class="btn btn-sm btn-link p-1 text-primary" (click)="openItemDialog(item)">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-link p-1 text-danger" (click)="deleteItem((item._id || item.id)!)">
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
            [length]="filteredItems().length" 
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
    .cursor-pointer { cursor: pointer; }
    .smaller { font-size: 0.75rem; }
  `]
})
export class InventoryComponent implements OnInit {
  pageIndex = signal(0);
  pageSize = signal(10);

  paginatedItems = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  constructor() { }

  isLoading = signal(true);
  searchTerm = signal('');
  categoryFilter = signal('all');
  items = signal<RentalItem[]>([]);
  categories = signal<Category[]>([]);
  bookings = signal<Booking[]>([]);
  maintenances = signal<Maintenance[]>([]);
  isImporting = signal(false);

  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.categoryFilter();

    return this.items().filter((item) => {
      const matchesSearch = (item.name || '').toLowerCase().includes(term) || (item.sku || '').toLowerCase().includes(term);
      const itemCategory = typeof item.category === 'object' ? (item.category as any)?._id || (item.category as any)?.id : item.category;
      const matchesCategory = filter === 'all' || itemCategory === filter;
      return matchesSearch && matchesCategory;
    });
  });

  totalItems = computed(() => {
    return this.items().reduce((sum, item) => sum + item.total_quantity, 0);
  });

  availableItems = computed(() => {
    return this.items().reduce((sum, item) => sum + this.getCalculatedAvailability(item), 0);
  });

  rentedItems = computed(() => {
    return this.items().reduce((sum, item) => sum + this.getRentedQuantity(item), 0);
  });

  utilizationRate = computed(() => {
    const total = this.totalItems();
    if (total === 0) return '0.0';
    return ((this.rentedItems() / total) * 100).toFixed(1);
  });

  private inventoryService = inject(InventoryService);
  private categoryService = inject(CategoryService);
  private bookingService = inject(BookingService);
  private maintenanceService = inject(MaintenanceService);
  private excelService = inject(ExcelService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.isLoading.set(true);
    forkJoin({
      items: this.inventoryService.getAll().pipe(catchError(() => of([]))),
      categories: this.categoryService.getAll().pipe(catchError(() => of([]))),
      bookings: this.bookingService.getAll().pipe(catchError(() => of([]))),
      maintenances: this.maintenanceService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.items.set(data.items);
        this.categories.set(data.categories);
        this.bookings.set(data.bookings);
        this.maintenances.set(data.maintenances);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getCalculatedAvailability(item: RentalItem): number {
    const itemId = item._id || item.id;
    const rented = this.getRentedQuantity(item);
    const inMaintenance = this.maintenances().filter(m => {
      const maintenanceItem = m.item as any;
      const mItemId = typeof maintenanceItem === 'object' ? maintenanceItem?._id || maintenanceItem?.id : maintenanceItem;
      return mItemId === itemId && ['scheduled', 'in_progress', 'overdue'].includes(m.status);
    }).length;

    return Math.max(0, item.total_quantity - rented - inMaintenance);
  }

  getRentedQuantity(item: RentalItem): number {
    const itemId = item._id || item.id;
    return this.bookings()
      .filter(b => b.status === 'active')
      .reduce((sum, b) => {
        const itemWrap = b.items.find(i => {
          const bookingItem = i.item as any;
          const bItemId = typeof bookingItem === 'object' ? bookingItem?._id || bookingItem?.id : bookingItem;
          return bItemId === itemId;
        });
        return sum + (itemWrap ? itemWrap.quantity : 0);
      }, 0);
  }

  getCalculatedStatus(item: RentalItem): string {
    const available = this.getCalculatedAvailability(item);
    if (available === 0) return 'rented';
    if (available < item.total_quantity) return 'partial';
    return 'available';
  }

  getEmptyItem(): Partial<RentalItem> {
    return {
      name: '',
      sku: '',
      category: undefined,
      total_quantity: 1,
      daily_rate: 0,
      weekly_rate: 0,
      condition: 'good',
      description: ''
    };
  }

  getCategoryName(category?: string | Category): string {
    if (!category) return 'Unknown';
    if (typeof category === 'object' && category.name) return category.name;
    return this.categories().find(c => (c._id || c.id) === category)?.name || 'Unknown';
  }

  getProgressBarClass(item: RentalItem): string {
    const avail = this.getCalculatedAvailability(item);
    if (avail === 0) return 'bg-danger';
    if (avail < item.total_quantity / 2) return 'bg-warning';
    return 'bg-success';
  }

  getCalculatedStatusClass(item: RentalItem): string {
    const status = this.getCalculatedStatus(item);
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    switch (status) {
      case 'available': return `${base} bg-success-subtle text-success border border-success`;
      case 'partial': return `${base} bg-primary-subtle text-primary border border-primary`;
      case 'rented': return `${base} bg-secondary-subtle text-secondary border border-secondary`;
      default: return `${base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  getConditionClass(condition: string): string {
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    switch (condition) {
      case 'excellent': return `${base} bg-success-subtle text-success border border-success`;
      case 'good': return `${base} bg-primary-subtle text-primary border border-primary`;
      case 'fair': return `${base} bg-warning-subtle text-warning-emphasis border border-warning`;
      default: return `${base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  openItemDialog(item?: RentalItem) {
    const dialogRef = this.dialog.open(InventoryFormDialogComponent, {
      data: {
        item: item ? { ...item } : this.getEmptyItem(),
        isEditing: !!item,
        categories: this.categories()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (item) {
          this.inventoryService.update(result as RentalItem).subscribe(() => this.refreshData());
        } else {
          this.inventoryService.add(result as RentalItem).subscribe(() => this.refreshData());
        }
      }
    });
  }

  deleteItem(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this item?', 'Confirm Delete', {
      duration: 5000, horizontalPosition: 'center', verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.inventoryService.delete(id).subscribe(() => {
        this.refreshData();
      });
    });
  }

  openCalendarDialog(item: RentalItem) {
    this.dialog.open(ItemAvailabilityCalendarDialogComponent, {
      width: '600px',
      data: {
        item: item,
        bookings: this.bookings()
      },
      panelClass: 'custom-dialog-container'
    });
  }

  exportToExcel() {
    const exportData = this.items().map(item => ({
      'Item Name': item.name,
      'SKU': item.sku,
      'Category': this.getCategoryName(item.category),
      'Total Quantity': item.total_quantity,
      'Calculated Available': this.getCalculatedAvailability(item),
      'Daily Rate': item.daily_rate,
      'Weekly Rate': item.weekly_rate,
      'Condition': item.condition,
      'Status': this.getCalculatedStatus(item),
      'Description': item.description || ''
    }));
    this.excelService.exportToFile(exportData, 'Inventory_Data', 'Inventory');
  }

  downloadTemplate() {
    const templateData = [{
      'Item Name': 'Example Item',
      'SKU': 'CAM-001',
      'Category': 'Cameras',
      'Total Quantity': 5,
      'Daily Rate': 50,
      'Weekly Rate': 250,
      'Condition': 'good',
      'Description': 'Example desc'
    }];
    this.excelService.exportToFile(templateData, 'Inventory_Import_Template', 'Template');
  }

  async onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.isImporting.set(true);
    try {
      const importedData = await this.excelService.parseFile(file);
      const validItems: RentalItem[] = importedData.map(row => {
        const category = this.categories().find(c => c.name.toLowerCase() === row['Category']?.toString().toLowerCase());
        return {
          name: row['Item Name'],
          sku: row['SKU'] || 'SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          category: category?._id || category?.id,
          total_quantity: Number(row['Total Quantity']) || 1,
          daily_rate: Number(row['Daily Rate']) || 0,
          weekly_rate: Number(row['Weekly Rate']) || 0,
          condition: (row['Condition']?.toString().toLowerCase() as any) || 'good',
          description: row['Description'] || '',
          created_at: new Date().toISOString()
        } as RentalItem;
      });

      this.inventoryService.bulkAdd(validItems).subscribe({
        next: () => {
          this.refreshData();
          this.snackBar.open(`Imported ${validItems.length} items successfully`, 'Close', { duration: 4000 });
        },
        error: () => {
          this.snackBar.open('Import failed. Please check your data or try again later.', 'Close', { duration: 5000, panelClass: ['bg-danger', 'text-white'] });
        }
      });
    } catch (err) {
      this.snackBar.open('Error parsing file.', 'Close', { duration: 4000, panelClass: ['bg-danger', 'text-white'] });
    } finally {
      this.isImporting.set(false);
      event.target.value = '';
    }
  }
}

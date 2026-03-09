import { Component, OnInit, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/rental.models';
import { ExpenseFormDialogComponent } from '../../features/expenses/components/expense-form-dialog/expense-form-dialog.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, MatTableModule, MatPaginatorModule],
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 class="h3 fw-bold text-dark mb-0">Bills & Expenses</h2>
          <p class="text-secondary mb-0">Track business expenses and bills payable</p>
        </div>
        <button class="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" (click)="openExpenseDialog()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Expenses (Paid)</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-danger mb-0 text-truncate">{{ totalPaidExpenses() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Pending Payments</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-warning-emphasis mb-0 text-truncate">{{ totalPendingExpenses() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Approved for Payment</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-primary mb-0 text-truncate">{{ totalApprovedExpenses() | currency:'INR':'symbol' }}</p>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <p class="text-secondary small mb-1 text-truncate" title="Metric">Total Records</p>
            <p class="h4 fw-bold fs-5 fs-md-4 text-dark mb-0 text-truncate">{{ expenses().length }}</p>
          </div>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="card shadow-sm border-0 p-4 mb-4">
        <div class="row g-3">
          <div class="col-12 col-md-8">
            <div class="input-group">
              <span class="input-group-text bg-transparent border-end-0 text-secondary">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by expense number, description, or vendor..."
                class="form-control border-start-0 ps-0"
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
              />
            </div>
          </div>
          <div class="col-12 col-md-4">
            <select
              class="form-select"
              [ngModel]="categoryFilter()"
              (ngModelChange)="categoryFilter.set($event)"
            >
              <option value="all">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat.toLowerCase()">{{ cat }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Expenses Table -->
      <div class="card shadow-sm border-0 overflow-hidden mb-4">
        <!-- Loader -->
        <div class="card-body text-center py-5" *ngIf="isLoading()">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="mt-2 text-secondary small">Loading expenses...</div>
        </div>

        <div class="table-responsive" [class.d-none]="isLoading()">
          <table mat-table [dataSource]="dataSource" class="w-100 table-hover align-middle mb-0">
            <ng-container matColumnDef="expense_number">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Expense #</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 small fw-medium text-dark">{{ expense.expense_number }}</td>
            </ng-container>

            <ng-container matColumnDef="expense_date">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Date</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 small text-secondary">{{ expense.expense_date }}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Category</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3">
                <span [class]="getCategoryClass(expense.category)">{{ expense.category | titlecase }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0" style="min-width: 250px;">Description</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3">
                <p class="small text-dark fw-medium mb-0 text-wrap text-truncate" style="max-width: 300px;">{{ expense.description }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="vendor">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Vendor</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 small text-secondary">{{ expense.vendor }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-end">Amount</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 small fw-bold text-danger text-nowrap text-end">{{ expense.amount | currency:'INR':'symbol' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-center">Status</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 text-center">
                <span [class]="getStatusClass(expense.status)">{{ expense.status | titlecase }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-end">Actions</th>
              <td mat-cell *matCellDef="let expense" class="px-4 py-3 text-end text-nowrap">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button class="btn btn-sm btn-link p-1 text-primary" (click)="openExpenseDialog(expense)">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button class="btn btn-sm btn-link p-1 text-danger" (click)="deleteExpense((expense._id || expense.id)!)">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="table-light text-secondary small text-uppercase fw-medium"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-bg-light"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="10" showFirstLastButtons></mat-paginator>
        </div>
    </div>
  `,
  styles: [`
    .smaller { font-size: 0.7rem; }
    .hover-bg-light:hover { background-color: var(--bs-light); }
  `]
})
export class ExpensesComponent implements OnInit {
  isLoading = signal(true);
  searchTerm = signal('');
  categoryFilter = signal('all');
  expenses = signal<Expense[]>([]);

  filteredExpenses = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.categoryFilter();
    return this.expenses().filter((e) => {
      const matchesSearch =
        (e.expense_number || '').toLowerCase().includes(term) ||
        (e.description || '').toLowerCase().includes(term) ||
        (e.vendor || '').toLowerCase().includes(term);
      const matchesCategory = filter === 'all' || e.category === filter;
      return matchesSearch && matchesCategory;
    });
  });

  totalPaidExpenses = computed(() => {
    return this.expenses().filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  });

  totalPendingExpenses = computed(() => {
    return this.expenses().filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  });

  totalApprovedExpenses = computed(() => {
    return this.expenses().filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  });

  categories = ['Maintenance', 'Fuel', 'Insurance', 'Utilities', 'Salary', 'Rent', 'Marketing', 'Other'];

  private expenseService = inject(ExpenseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['expense_number', 'expense_date', 'category', 'description', 'vendor', 'amount', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredExpenses();
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this.isLoading.set(true);
    this.expenseService.getAll().subscribe({
      next: (data) => {
        this.expenses.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getEmptyExpense(): Partial<Expense> {
    return {
      vendor: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: 'other',
      amount: 0,
      status: 'pending',
      description: ''
    };
  }

  // Placeholder for missing logic if needed

  getCategoryClass(category: string): string {
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    switch (category) {
      case 'maintenance': return `₹{base} bg-warning-subtle text-warning-emphasis border border-warning`;
      case 'fuel': return `₹{base} bg-warning-subtle text-dark border border-warning`;
      case 'insurance': return `₹{base} bg-info-subtle text-info border border-info`;
      case 'salary': return `₹{base} bg-success-subtle text-success border border-success`;
      case 'rent': return `₹{base} bg-primary-subtle text-primary border border-primary`;
      case 'marketing': return `₹{base} bg-danger-subtle text-danger border border-danger`;
      case 'utilities': return `₹{base} bg-info-subtle text-info border border-info`;
      default: return `₹{base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  getStatusClass(status: string): string {
    const base = 'badge rounded-pill fw-normal px-3 py-2';
    switch (status) {
      case 'paid': return `₹{base} bg-success-subtle text-success border border-success`;
      case 'pending': return `₹{base} bg-danger-subtle text-danger border border-danger`;
      case 'approved': return `₹{base} bg-warning-subtle text-warning-emphasis border border-warning`;
      default: return `₹{base} bg-secondary-subtle text-secondary border border-secondary`;
    }
  }

  openExpenseDialog(expense?: Expense) {
    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      data: {
        expense: expense ? { ...expense } : this.getEmptyExpense(),
        isEditing: !!expense,
        categories: this.categories
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (expense) {
          this.expenseService.update(result as Expense).subscribe(() => this.loadExpenses());
        } else {
          const newExpense = {
            ...result,
            expense_number: this.expenseService.generateCode('EXP'),
            created_at: new Date().toISOString()
          } as Expense;
          this.expenseService.add(newExpense).subscribe(() => this.loadExpenses());
        }
      }
    });
  }

  deleteExpense(id: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this expense?', 'Confirm Delete', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    snackBarRef.onAction().subscribe(() => {
      this.expenseService.delete(id).subscribe(() => {
        this.loadExpenses();
      });
    });
  }
}

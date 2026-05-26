import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpenseService } from '../../../services/expense.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-expense-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './expense-types.html',
  styleUrls: ['./expense-types.scss']
})
export class ExpenseTypesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);

  typeForm!: FormGroup;
  expenseTypes = signal<string[]>([]);
  isAdding = signal(false);

  ngOnInit() {
    this.initForm();
    this.loadExpenseTypes();
  }

  private initForm() {
    this.typeForm = this.fb.group({
      newType: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]]
    });
  }

  loadExpenseTypes() {
    this.expenseService.getExpenseTypes().subscribe({
      next: (res: any) => {
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.expenseTypes.set(data);
      }
    });
  }

  onAdd() {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    this.isAdding.set(true);
    const newType = this.typeForm.value.newType.trim();

    this.expenseService.addExpenseType(newType).subscribe({
      next: (res: any) => {
        this.isAdding.set(false);
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.expenseTypes.set(data);
        this.typeForm.reset();
      },
      error: (err) => {
        this.isAdding.set(false);
        console.error('Error adding expense category', err);
      }
    });
  }

  onDelete(type: string) {
    if (confirm(`Are you sure you want to delete the expense category "${type}"?`)) {
      this.expenseService.deleteExpenseType(type).subscribe({
        next: (res: any) => {
          const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
          this.expenseTypes.set(data);
        },
        error: (err) => {
          console.error('Error deleting expense category', err);
        }
      });
    }
  }
}

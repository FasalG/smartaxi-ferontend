import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpenseService } from '../../../services/expense.service';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { SettlementService } from '../../../services/settlement.service';
import { Vehicle, Trip } from '../../../models/rental.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-expense-tracker',
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
  templateUrl: './expense-tracker.html',
  styleUrls: ['./expense-tracker.scss']
})
export class ExpenseTrackerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private settlementService = inject(SettlementService);

  expenseForm!: FormGroup;
  expenses = signal<any[]>([]);
  vehicles = signal<Vehicle[]>([]);
  pendingTrips = signal<Trip[]>([]);
  vehicleSearchQuery = signal('');
  expenseTypes = signal<string[]>([]);
  isSubmitting = signal(false);
  showForm = signal(false);
  editingExpenseId = signal<string | null>(null);
  selectedImageBase64: string | null = null;
  selectedFileName = signal<string | null>(null);

  filteredVehicles = computed(() => {
    const query = this.vehicleSearchQuery().toLowerCase().trim();
    const list = this.vehicles();
    if (!query) return list;
    return list.filter(v =>
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.licensePlate.toLowerCase().includes(query)
    );
  });

  getTripOutstanding(trip: Trip): number {
    const originalDue = trip.driverSettlementAmount || 0;
    const confirmedPaid = trip.driverSettlementPaidAmount || 0;
    const pendingPaid = trip.submittedAmount || 0;
    const approvedExpenses = trip.linkedExpenses
      ? trip.linkedExpenses.filter((e: any) => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
      : 0;
    return originalDue - confirmedPaid - pendingPaid - approvedExpenses;
  }

  tripsOwedToAdmin = computed(() => {
    const formTripId = this.expenseForm ? this.expenseForm.get('tripId')?.value : '';
    return this.pendingTrips().filter(t => {
      if (t._id === formTripId) return true;
      return this.getTripOutstanding(t) > 0;
    });
  });

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.resetForm();
      this.editingExpenseId.set(null);
    }
  }

  ngOnInit() {
    this.initForm();
    this.loadVehicles();
    this.loadExpenseTypes();
    this.loadExpenses();
    this.loadPendingTrips();
  }

  private initForm() {
    const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    this.expenseForm = this.fb.group({
      expenseType: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      date: [today, Validators.required],
      vehicleId: ['', Validators.required],
      remarks: [''],
      imageUrl: [''],
      tripId: ['']
    });

    // Listen to expenseType changes
    this.expenseForm.get('expenseType')?.valueChanges.subscribe(value => {
      this.onTypeChange(value);
    });
  }

  onTypeChange(type: string) {
    const remarksControl = this.expenseForm.get('remarks');
    if (remarksControl) {
      if (type === 'Other') {
        remarksControl.setValidators([Validators.required]);
      } else {
        remarksControl.clearValidators();
      }
      remarksControl.updateValueAndValidity();
    }
  }

  onVehicleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.vehicleSearchQuery.set(input.value);
  }

  loadVehicles() {
    this.vehicleService.getVehicles().subscribe({
      next: (res: any) => {
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.vehicles.set(data);
      }
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

  loadExpenses() {
    this.expenseService.getAll().subscribe({
      next: (res: any) => {
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.expenses.set(data);
      }
    });
  }

  loadPendingTrips() {
    this.settlementService.getPendingTrips().subscribe({
      next: (trips: Trip[]) => {
        this.pendingTrips.set(trips || []);
      },
      error: (err) => {
        console.error('Error loading pending trips:', err);
      }
    });
  }

  onEdit(item: any) {
    this.editingExpenseId.set(item._id || item.id);
    this.showForm.set(true);
    
    const formattedDate = item.date ? new Date(item.date).toISOString().substring(0, 10) : '';
    const vehicleId = item.vehicleId && typeof item.vehicleId === 'object' ? item.vehicleId._id : item.vehicleId;
    const tripId = item.tripId && typeof item.tripId === 'object' ? item.tripId._id : item.tripId;

    this.selectedImageBase64 = item.imageUrl || null;
    this.selectedFileName.set(item.imageUrl ? 'Receipt Image' : null);

    this.expenseForm.patchValue({
      expenseType: item.expenseType,
      amount: item.amount,
      date: formattedDate,
      vehicleId: vehicleId || '',
      remarks: item.remarks || '',
      imageUrl: item.imageUrl || '',
      tripId: tripId || ''
    });
  }

  onDelete(id: string) {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.expenseService.delete(id).subscribe({
        next: () => {
          this.loadExpenses();
          this.loadPendingTrips();
        },
        error: (err) => {
          console.error('Error deleting expense', err);
        }
      });
    }
  }

  onCancelEdit() {
    this.resetForm();
    this.editingExpenseId.set(null);
    this.showForm.set(false);
  }

  onSubmit() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.expenseForm.value;
    const payload = {
      ...formVal,
      tripId: formVal.tripId || null,
      imageUrl: this.selectedImageBase64
    };

    if (this.editingExpenseId()) {
      const updatedItem = {
        ...payload,
        _id: this.editingExpenseId()
      };
      this.expenseService.update(updatedItem).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.resetForm();
          this.editingExpenseId.set(null);
          this.showForm.set(false);
          this.loadExpenses();
          this.loadPendingTrips();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Error updating expense', err);
        }
      });
    } else {
      this.expenseService.add(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.resetForm();
          this.loadExpenses();
          this.loadPendingTrips();
          this.showForm.set(false);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Error logging expense', err);
        }
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFileName.set(file.name);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          this.compressImage(img, file.type, (compressedBase64) => {
            this.selectedImageBase64 = compressedBase64;
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  compressImage(img: HTMLImageElement, fileType: string, callback: (base64: string) => void) {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    const MAX_WIDTH = 1200;
    const MAX_HEIGHT = 1200;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.8;
      let dataUrl = canvas.toDataURL(fileType, quality);
      
      // Auto compress the image below 1MB (roughly 1.33 million characters)
      while (dataUrl.length > 1333333 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL(fileType, quality);
      }
      
      callback(dataUrl);
    } else {
      callback(img.src);
    }
  }

  removeImage() {
    this.selectedImageBase64 = null;
    this.selectedFileName.set(null);
    this.expenseForm.patchValue({ imageUrl: '' });
  }

  private resetForm() {
    const today = new Date().toISOString().substring(0, 10);
    this.expenseForm.reset({
      expenseType: '',
      amount: '',
      date: today,
      vehicleId: '',
      remarks: '',
      imageUrl: '',
      tripId: ''
    });
    this.selectedImageBase64 = null;
    this.selectedFileName.set(null);
    this.vehicleSearchQuery.set('');
  }
}

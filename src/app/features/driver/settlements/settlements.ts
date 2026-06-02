import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettlementService } from '../../../services/settlement.service';
import { ExpenseService } from '../../../services/expense.service';
import { Trip, DriverSettlement } from '../../../models/rental.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-driver-settlements',
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
  templateUrl: './settlements.html',
  styleUrls: ['./settlements.scss']
})
export class DriverSettlementsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private settlementService = inject(SettlementService);
  private expenseService = inject(ExpenseService);
  protected readonly Math = Math;

  asTrip(tripId: string | Trip | undefined): Trip {
    return tripId as Trip;
  }

  handoverForm!: FormGroup;
  pendingTrips = signal<Trip[]>([]);
  driverExpenses = signal<any[]>([]);
  settlementHistory = signal<DriverSettlement[]>([]);
  
  loading = signal(false);
  submitting = signal(false);
  showForm = signal(false);
  
  selectedImageBase64: string | null = null;
  selectedFileName = signal<string | null>(null);

  // Tracks selected trip IDs and their custom allocation amounts
  selectedTripIds = signal<Set<string>>(new Set<string>());
  allocations = signal<{ [tripId: string]: number }>({});
  
  // Detailed view of history item
  expandedSettlementId = signal<string | null>(null);

  // Overview stats based on pending trips and standalone driver expenses
  stats = computed(() => {
    const trips = this.pendingTrips();
    const standaloneExpenses = this.driverExpenses();

    const totalCollected = trips.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalTripExpenses = trips.reduce((sum, t) => sum + this.getTripExpenses(t), 0);
    const totalEarnings = trips.reduce((sum, t) => sum + (t.driverEarnings || 0), 0);

    // Remaining trip settlement amount (after driver has submitted handovers), adjusted for linked approved expenses
    const tripNetRemaining = trips.reduce((sum, t) => {
      const originalDue = t.driverSettlementAmount || 0;
      const confirmedPaid = t.driverSettlementPaidAmount || 0;
      const approvedExpenses = t.linkedExpenses
        ? t.linkedExpenses.filter((e: any) => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
        : 0;
      return sum + Math.max(0, originalDue - confirmedPaid - approvedExpenses);
    }, 0);

    // Only subtract approved expenses that are standalone (not linked to any trip)
    const approvedStandaloneExpenses = standaloneExpenses
      .filter((e: any) => e.status === 'approved' && !e.tripId)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // Final Net Settlement = Remaining Trip Settlement - Approved Standalone Expenses
    const netDue = tripNetRemaining - approvedStandaloneExpenses;

    // Total approved logged expenses for display
    const allApprovedExpenses = standaloneExpenses
      .filter((e: any) => e.status === 'approved')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    return {
      cashCollected: totalCollected,
      expenses: totalTripExpenses + allApprovedExpenses,
      earnings: totalEarnings,
      netDue: netDue
    };
  });

  // Total allocated amount computed dynamically from active selections
  totalAllocated = computed(() => {
    let sum = 0;
    const selectedIds = this.selectedTripIds();
    const allocMap = this.allocations();
    
    selectedIds.forEach(id => {
      sum += allocMap[id] || 0;
    });
    return sum;
  });

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  private initForm() {
    const today = new Date().toISOString().substring(0, 10);
    this.handoverForm = this.fb.group({
      amount: [0, [
        Validators.required, 
        Validators.min(1),
        (control: any) => {
          const maxVal = this.stats ? this.stats().netDue : Infinity;
          if (control.value > maxVal) {
            return { maxDueExceeded: true };
          }
          return null;
        }
      ]],
      paymentMethod: ['gpay', Validators.required],
      paymentDate: [today, Validators.required],
      referenceId: [''], // UTR is optional
      notes: ['']
    });

    // Sync form amount with totalAllocated when it changes, but allow manual edits
    this.handoverForm.get('amount')?.valueChanges.subscribe(val => {
      this.redistributeHandoverAmount();
    });
  }

  loadData() {
    this.loading.set(true);
    // Load pending trips
    this.settlementService.getPendingTrips().subscribe({
      next: (trips: Trip[]) => {
        this.pendingTrips.set(trips || []);
        this.loading.set(false);
        this.handoverForm.get('amount')?.updateValueAndValidity();
      },
      error: (err: any) => {
        console.error('Error loading pending trips:', err);
        this.loading.set(false);
      }
    });

    // Load history
    this.settlementService.getDriverSettlements().subscribe({
      next: (history: DriverSettlement[]) => {
        this.settlementHistory.set(history || []);
      },
      error: (err: any) => {
        console.error('Error loading settlements history:', err);
      }
    });

    // Load driver standalone expenses
    this.expenseService.getAll().subscribe({
      next: (expenses: any[]) => {
        this.driverExpenses.set(expenses || []);
      },
      error: (err: any) => {
        console.error('Error loading driver expenses:', err);
      }
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  // Get outstanding balance for a trip: driverSettlementAmount - already paid - currently pending in other submissions
  getTripOutstanding(trip: Trip): number {
    const originalDue = trip.driverSettlementAmount || 0;
    const confirmedPaid = trip.driverSettlementPaidAmount || 0;
    const pendingPaid = trip.submittedAmount || 0;
    
    // Sum up approved expenses linked to this trip
    const approvedExpenses = trip.linkedExpenses
      ? trip.linkedExpenses.filter((e: any) => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
      : 0;

    return Math.max(0, originalDue - confirmedPaid - pendingPaid - approvedExpenses);
  }

  redistributeHandoverAmount() {
    const formAmount = this.handoverForm?.get('amount')?.value || 0;
    let remaining = formAmount;
    const allocMap: { [tripId: string]: number } = {};
    const selected = new Set(this.selectedTripIds());

    selected.forEach(id => {
      const trip = this.pendingTrips().find(t => t._id === id);
      if (trip) {
        const outstanding = this.getTripOutstanding(trip);
        if (outstanding > 0 && remaining > 0) {
          const allocate = Math.min(outstanding, remaining);
          allocMap[id] = parseFloat(allocate.toFixed(2));
          remaining -= allocate;
        } else {
          allocMap[id] = 0;
        }
      } else {
        selected.delete(id);
      }
    });

    this.allocations.set(allocMap);
    this.selectedTripIds.set(selected);
  }

  // Triggered when checking/unchecking a trip checkbox
  onTripSelect(trip: Trip, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const tripId = trip._id!;
    const selected = new Set(this.selectedTripIds());

    if (checked) {
      selected.add(tripId);
    } else {
      selected.delete(tripId);
    }

    this.selectedTripIds.set(selected);
    this.redistributeHandoverAmount();
  }

  // Handles manual adjustments to a trip's allocation input
  onAllocationChange(trip: Trip, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    const tripId = trip._id!;
    const outstanding = this.getTripOutstanding(trip);
    
    // Clamp between 0 and trip's outstanding
    const clampedVal = Math.max(0, Math.min(outstanding, val));
    
    const selected = new Set(this.selectedTripIds());
    const allocMap = { ...this.allocations() };

    if (clampedVal > 0) {
      selected.add(tripId);
      allocMap[tripId] = clampedVal;
    } else {
      allocMap[tripId] = 0;
    }

    this.selectedTripIds.set(selected);
    this.allocations.set(allocMap);

    // Update the form transfer amount
    this.handoverForm.patchValue({ amount: this.totalAllocated() }, { emitEvent: false });
    this.handoverForm.get('amount')?.updateValueAndValidity();
  }

  // Auto allocate custom entered amount from oldest to newest pending trips
  applyAutoAllocation() {
    const formAmount = this.handoverForm.value.amount || 0;
    if (formAmount <= 0) return;

    let remainingMoney = formAmount;
    const selected = new Set<string>();
    const allocMap: { [tripId: string]: number } = {};

    // Clone and sort trips by startTime ascending (oldest first)
    const sortedTrips = [...this.pendingTrips()].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (const trip of sortedTrips) {
      if (remainingMoney <= 0) break;

      const outstanding = this.getTripOutstanding(trip);
      if (outstanding <= 0) continue;

      const allocate = Math.min(outstanding, remainingMoney);
      const tripId = trip._id!;
      
      selected.add(tripId);
      allocMap[tripId] = parseFloat(allocate.toFixed(2));
      remainingMoney -= allocate;
    }

    this.selectedTripIds.set(selected);
    this.allocations.set(allocMap);

    // If there is leftover money (overpayment), we can attach it to the first/newest trip or alert
    if (remainingMoney > 0) {
      alert(`Note: ₹${remainingMoney.toFixed(2)} remains unallocated since it exceeds total outstanding trip dues.`);
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
  }

  toggleExpand(settlementId: string) {
    if (this.expandedSettlementId() === settlementId) {
      this.expandedSettlementId.set(null);
    } else {
      this.expandedSettlementId.set(settlementId);
    }
  }

  getTripExpenses(trip: any): number {
    return (trip.fuelCharges || 0) + (trip.tollParking || 0) + (trip.driverBata || 0) + (trip.permitAmount || 0) + (trip.otherExpenses || 0);
  }

  onSubmit() {
    if (this.handoverForm.invalid) {
      this.handoverForm.markAllAsTouched();
      return;
    }

    const selectedIds = this.selectedTripIds();
    const allocMap = this.allocations();

    if (selectedIds.size === 0) {
      alert('Please select at least one trip to allocate your handover payment.');
      return;
    }

    this.submitting.set(true);
    const formVal = this.handoverForm.value;

    // Build the allocations array for backend ingestion
    const tripsPayload = Array.from(selectedIds).map(id => ({
      tripId: id,
      allocatedAmount: allocMap[id]
    }));

    const payload: Partial<DriverSettlement> = {
      amount: formVal.amount,
      paymentMethod: formVal.paymentMethod,
      paymentDate: new Date(formVal.paymentDate).toISOString(),
      referenceId: formVal.referenceId,
      notes: formVal.notes,
      receiptUrl: this.selectedImageBase64 || undefined,
      trips: tripsPayload
    };

    this.settlementService.submitSettlement(payload).subscribe({
      next: (res: DriverSettlement) => {
        this.submitting.set(false);
        this.resetForm();
        this.showForm.set(false);
        this.loadData();
        alert('Handover request submitted successfully!');
      },
      error: (err: any) => {
        this.submitting.set(false);
        console.error('Error submitting handover:', err);
        alert(err.message || 'Error submitting handover request. Please try again.');
      }
    });
  }

  private resetForm() {
    const today = new Date().toISOString().substring(0, 10);
    this.handoverForm.reset({
      amount: 0,
      paymentMethod: 'gpay',
      paymentDate: today,
      referenceId: '',
      notes: ''
    });
    this.selectedImageBase64 = null;
    this.selectedFileName.set(null);
    this.selectedTripIds.set(new Set<string>());
    this.allocations.set({});
  }
}

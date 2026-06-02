import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { AuthService } from '../../../services/auth.service';
import { Trip } from '../../../models/rental.models';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
  selector: 'app-trip-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './trip-history.html',
  styleUrls: ['./trip-history.scss'],
})
export class TripHistoryComponent implements OnInit {
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

  currentUser = this.authService.currentUser;
  historyTrips = signal<any[]>([]);
  selectedTrip = signal<Trip | null>(null);
  loading = signal(false);
  showHistory = signal(true);
  showTripDetail = signal(false);
  isEditing = signal(false);
  tripForm!: FormGroup;

  // Advanced Settlement State
  showAdjustmentUI = signal(false);
  selectedAdjustmentTripId = signal<string>('');
  adjustmentAmount = signal<number>(0);

  availableLinkedTrips = computed(() => {
    const trip = this.selectedTrip();
    if (!trip) return [];

    if ((trip.driverSettlementAmount || 0) > 0) {
      return this.historyTrips().filter(t => t.driverPaymentStatus === 'pending' && (t.driverSettlementAmount || 0) < 0 && t._id !== trip._id);
    }
    else if ((trip.driverSettlementAmount || 0) < 0) {
      return this.historyTrips().filter(t => t.driverPaymentStatus === 'pending' && (t.driverSettlementAmount || 0) > 0 && t._id !== trip._id);
    }
    return [];
  });

  getTripRemaining(trip: any): number {
    if (!trip) return 0;
    if (trip.driverPaymentStatus === 'confirmed') return 0;
    const approvedExpenses = (trip.linkedExpenses || [])
      .filter((e: any) => e.status === 'approved')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const originalDues = (trip.driverSettlementAmount || 0) - (trip.driverSettlementPaidAmount || 0);
    return originalDues - approvedExpenses;
  }

  totalSettlementOwed = computed(() => {
    return this.historyTrips()
      .filter(t => t.driverPaymentStatus === 'pending')
      .reduce((sum, t) => {
        const rem = this.getTripRemaining(t);
        return sum + (rem > 0 ? rem : 0);
      }, 0);
  });

  totalRefundDue = computed(() => {
    return Math.abs(this.historyTrips()
      .filter(t => t.driverPaymentStatus === 'pending')
      .reduce((sum, t) => {
        const rem = this.getTripRemaining(t);
        return sum + (rem < 0 ? rem : 0);
      }, 0));
  });

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading.set(true);
    this.tripService.getDriverTrips().subscribe({
      next: (trips) => {
        const past = trips.filter(t => t.status !== 'in-progress' && t.status !== 'scheduled');
        this.historyTrips.set(past);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleHistory() {
    this.showHistory.set(!this.showHistory());
  }

  submitSettlement(trip: any, method: 'cash' | 'balance') {
    const isPositive = (trip.driverSettlementAmount || 0) > 0;

    if (method === 'balance') {
      this.showAdjustmentUI.set(true);
      if (this.availableLinkedTrips().length > 0) {
        this.selectedAdjustmentTripId.set(this.availableLinkedTrips()[0]._id);
        const tripOwed = Math.abs(trip.driverSettlementAmount);
        const prevRefund = Math.abs(this.availableLinkedTrips()[0].driverSettlementAmount);
        this.adjustmentAmount.set(Math.min(tripOwed, prevRefund));
      }
      return;
    }

    const actionText = isPositive
      ? 'Transferring cash to Admin'
      : 'Receiving cash refund from Admin';

    this.confirmDialog.title = 'Submit Settlement';
    this.confirmDialog.message = `Confirm: ${actionText}? This request will be sent to admin for final approval.`;
    this.confirmDialog.confirmText = 'Submit Request';
    this.confirmDialog.type = 'info';

    this.confirmDialog.open().then(confirmed => {
      if (confirmed) {
        this.loading.set(true);
        this.tripService.updateTrip(trip._id, {
          driverPaymentStatus: 'submitted',
          driverSettlementMethod: method,
          driverPaymentSubmittedAt: new Date().toISOString()
        }).subscribe({
          next: () => {
            this.loading.set(false);
            this.loadInitialData();
            this.closeTripDetail();
          },
          error: () => this.loading.set(false)
        });
      }
    });
  }

  onAdjustmentTripChange(event: any) {
    const val = event.target.value;
    this.selectedAdjustmentTripId.set(val);
    if (val) {
      const prevTrip = this.availableLinkedTrips().find(t => t._id === val);
      if (prevTrip) {
        const tripOwed = Math.abs(this.selectedTrip()?.driverSettlementAmount || 0);
        const prevRefund = Math.abs(prevTrip.driverSettlementAmount);
        this.adjustmentAmount.set(Math.min(tripOwed, prevRefund));
      }
    }
  }

  onAdjustmentAmountChange(event: any) {
    this.adjustmentAmount.set(Number((event.target as HTMLInputElement).value));
  }

  async confirmLinkedAdjustment() {
    const trip = this.selectedTrip();
    const prevTripId = this.selectedAdjustmentTripId();
    const amount = this.adjustmentAmount();

    if (!trip || !prevTripId || amount <= 0) return;

    const prevTrip = this.availableLinkedTrips().find(t => t._id === prevTripId);
    if (!prevTrip) return;

    this.confirmDialog.title = 'Balance Adjustment';
    this.confirmDialog.message = `Confirm adjusting ₹${amount} from past balance of customer ${prevTrip.customerName}?`;
    this.confirmDialog.confirmText = 'Apply Adjustment';
    this.confirmDialog.type = 'info';

    const confirmed = await this.confirmDialog.open();
    if (!confirmed) return;

    this.loading.set(true);

    const newCurrentSettlementAmount = (trip.driverSettlementAmount || 0) > 0
      ? ((trip.driverSettlementAmount || 0) - amount)
      : ((trip.driverSettlementAmount || 0) + amount);

    const currentTripNote = `[SYSTEM] Balance Offset: Original ₹${Math.abs(trip.driverSettlementAmount || 0)} - Applied ₹${amount} = Remaining ₹${Math.abs(newCurrentSettlementAmount)}. Offset using past balance from customer ${prevTrip.customerName} (on ${new Date(prevTrip.startTime).toLocaleDateString()}).\n${trip.notes || ''}`;

    const isCurrentFullyAdjusted = amount >= Math.abs(trip.driverSettlementAmount || 0);

    const currentTripPayload: any = {
      driverSettlementAmount: newCurrentSettlementAmount,
      notes: currentTripNote
    };

    if (isCurrentFullyAdjusted) {
      currentTripPayload.driverPaymentStatus = 'submitted';
      currentTripPayload.driverSettlementMethod = 'balance';
      currentTripPayload.driverPaymentSubmittedAt = new Date().toISOString();
    }

    this.tripService.updateTrip(trip._id!, currentTripPayload).subscribe({
      next: () => {
        const newPrevSettlementAmount = (prevTrip.driverSettlementAmount || 0) > 0
          ? ((prevTrip.driverSettlementAmount || 0) - amount)
          : ((prevTrip.driverSettlementAmount || 0) + amount);

        const prevTripNote = `[SYSTEM] Balance Offset: Original ₹${Math.abs(prevTrip.driverSettlementAmount || 0)} - Applied ₹${amount} = Remaining ₹${Math.abs(newPrevSettlementAmount)}. Sent to offset trip for customer ${trip.customerName}.\n${prevTrip.notes || ''}`;

        const fullyAdjusted = amount >= Math.abs((prevTrip.driverSettlementAmount || 0));

        const payload: any = {
          notes: prevTripNote,
          driverSettlementAmount: newPrevSettlementAmount
        };

        if (fullyAdjusted && prevTrip.driverPaymentStatus === 'pending') {
          payload.driverPaymentStatus = 'submitted';
          payload.driverSettlementMethod = 'balance';
          payload.driverPaymentSubmittedAt = new Date().toISOString();
        }

        this.tripService.updateTrip(prevTripId, payload).subscribe({
          next: () => {
            this.loading.set(false);
            this.showAdjustmentUI.set(false);
            this.closeTripDetail();
            this.loadInitialData();
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  getTripExpenses(trip: any) {
    const fuel = trip.fuelCharges || 0;
    const toll = trip.tollParking || 0;
    const bata = trip.driverBata || 0;
    const permit = trip.permitAmount || 0;
    const other = trip.otherExpenses || 0;
    return fuel + toll + bata + permit + other;
  }

  viewTripDetail(trip: any) {
    this.selectedTrip.set(trip);
    this.showTripDetail.set(true);
    this.showHistory.set(false); // Hide the main list
    document.body.style.overflow = 'hidden';
  }

  mathAbs(n: number | undefined): number {
    return Math.abs(n || 0);
  }

  initForm() {
    this.tripForm = this.fb.group({
      startLocation: ['', Validators.required],
      endLocation: [''],
      startOdometer: [0, [Validators.required, Validators.min(0)]],
      endOdometer: [0, [Validators.required, Validators.min(0)]],
      startTime: ['', Validators.required],
      endTime: [''],
      baseInvoiceAmount: [0, [Validators.required, Validators.min(0)]],
      fuelCharges: [0, [Validators.required, Validators.min(0)]],
      tollParking: [0, [Validators.required, Validators.min(0)]],
      driverBata: [0, [Validators.required, Validators.min(0)]],
      permitAmount: [0, [Validators.required, Validators.min(0)]],
      advanceAmount: [0, [Validators.required, Validators.min(0)]],
      driverAdvanceAmount: [0, [Validators.required, Validators.min(0)]],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  startEditing() {
    const trip = this.selectedTrip();
    if (!trip) return;
    
    if (!this.tripForm) {
      this.initForm();
    }

    const formattedStart = trip.startTime ? new Date(trip.startTime).toISOString().slice(0, 16) : '';
    const formattedEnd = trip.endTime ? new Date(trip.endTime).toISOString().slice(0, 16) : '';

    this.tripForm.patchValue({
      startLocation: trip.startLocation,
      endLocation: trip.endLocation || '',
      startOdometer: trip.startOdometer,
      endOdometer: trip.endOdometer || 0,
      startTime: formattedStart,
      endTime: formattedEnd,
      baseInvoiceAmount: trip.baseInvoiceAmount || 0,
      fuelCharges: trip.fuelCharges || 0,
      tollParking: trip.tollParking || 0,
      driverBata: trip.driverBata || 0,
      permitAmount: trip.permitAmount || 0,
      advanceAmount: trip.advanceAmount || 0,
      driverAdvanceAmount: trip.driverAdvanceAmount || 0,
      paidAmount: trip.paidAmount || 0,
      notes: trip.notes || ''
    });

    this.isEditing.set(true);
  }

  saveTripChanges() {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    const trip = this.selectedTrip();
    if (!trip || !trip._id) return;

    this.loading.set(true);
    const formVal = this.tripForm.value;

    const start = new Date(formVal.startTime);
    const end = formVal.endTime ? new Date(formVal.endTime) : null;
    let hours = 0;
    let days = 0;
    if (end) {
      hours = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 36e5);
      days = Math.ceil(hours / 24);
    }
    const totalKm = (formVal.endOdometer && formVal.startOdometer)
      ? Math.max(0, formVal.endOdometer - formVal.startOdometer)
      : 0;

    const payload: any = {
      startLocation: formVal.startLocation,
      endLocation: formVal.endLocation,
      startOdometer: Number(formVal.startOdometer),
      endOdometer: Number(formVal.endOdometer),
      startTime: start.toISOString(),
      endTime: end ? end.toISOString() : null,
      baseInvoiceAmount: Number(formVal.baseInvoiceAmount),
      fuelCharges: Number(formVal.fuelCharges),
      tollParking: Number(formVal.tollParking),
      driverBata: Number(formVal.driverBata),
      permitAmount: Number(formVal.permitAmount),
      advanceAmount: Number(formVal.advanceAmount),
      driverAdvanceAmount: Number(formVal.driverAdvanceAmount),
      paidAmount: Number(formVal.paidAmount),
      notes: formVal.notes,
      totalKm,
      totalHours: hours,
      totalDays: days,
      totalAmount: Number(formVal.baseInvoiceAmount),
      driverEarnings: undefined,
      balanceAmount: undefined,
      driverSettlementAmount: undefined
    };

    this.tripService.updateTrip(trip._id, payload).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.isEditing.set(false);
        const updatedTrip = res && res.data ? res.data : res;
        this.selectedTrip.set(updatedTrip);
        this.loadInitialData();
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error saving trip changes:', err);
      }
    });
  }

  closeTripDetail() {
    this.showTripDetail.set(false);
    this.showAdjustmentUI.set(false);
    this.isEditing.set(false);
    this.selectedTrip.set(null);
    this.showHistory.set(true); // Show the main list again
    document.body.style.overflow = 'auto';
  }
}

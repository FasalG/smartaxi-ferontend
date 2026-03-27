import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { CustomerService } from '../../../services/customer.service';
import { Trip, Vehicle, Customer } from '../../../models/rental.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './driver-dashboard.html',
  styleUrls: ['./driver-dashboard.scss'],
})
export class DriverDashboard implements OnInit {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private customerService = inject(CustomerService);

  @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

  currentUser = this.authService.currentUser;

  activeTrip = signal<Trip | null>(null);
  scheduledTrips = signal<Trip[]>([]);
  pastTrips = signal<Trip[]>([]);
  historyTrips = signal<any[]>([]);

  availableLinkedTrips = computed(() => {
    const trip = this.selectedTrip();
    if (!trip) return [];

    // Scenario A: Current trip owes Admin (amount > 0). Can balance using past trips Admin owes Driver (amount < 0)
    if ((trip.driverSettlementAmount || 0) > 0) {
      return this.historyTrips().filter(t => t.driverPaymentStatus === 'pending' && (t.driverSettlementAmount || 0) < 0 && t._id !== trip._id);
    }
    // Scenario B: Admin owes Current trip (amount < 0). Can take refund using past trips Driver owes Admin (amount > 0)
    else if ((trip.driverSettlementAmount || 0) < 0) {
      return this.historyTrips().filter(t => t.driverPaymentStatus === 'pending' && (t.driverSettlementAmount || 0) > 0 && t._id !== trip._id);
    }
    return [];
  });

  totalSettlementOwed = computed(() => {
    return this.historyTrips()
      .filter(t => t.driverPaymentStatus === 'pending' && t.driverSettlementAmount > 0)
      .reduce((sum, t) => sum + t.driverSettlementAmount, 0);
  });

  totalRefundDue = computed(() => {
    return Math.abs(this.historyTrips()
      .filter(t => t.driverPaymentStatus === 'pending' && t.driverSettlementAmount < 0)
      .reduce((sum, t) => sum + t.driverSettlementAmount, 0));
  });

  vehicles = signal<Vehicle[]>([]);
  customers = signal<Customer[]>([]);
  selectedTrip = signal<Trip | null>(null);

  activeTripCustomer = computed(() => {
    const trip = this.activeTrip();
    if (!trip || !trip.customerId) return null;
    const cid = typeof trip.customerId === 'object' && trip.customerId !== null ? (trip.customerId._id || trip.customerId.id) : trip.customerId;
    return this.customers().find(c => c._id === cid) || null;
  });

  selectedVehicleId = signal<string>('');

  showStartTripForm = signal(false);
  showCompleteTripForm = signal(false);
  showHistory = signal(false);
  showTripDetail = signal(false);

  // Advanced Settlement State
  showAdjustmentUI = signal(false);
  selectedAdjustmentTripId = signal<string>('');
  adjustmentAmount = signal<number>(0);

  loading = signal(false);

  startTripForm = this.fb.group({
    vehicleId: ['', Validators.required],
    customerId: ['', Validators.required],
    newCustomerName: [''],
    newCustomerPhone: [''],
    newCustomerEmail: [''],
    newCustomerAddress: [''],
    startLocation: ['', Validators.required],
    startOdometer: ['', [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  completeTripForm = this.fb.group({
    endLocation: ['', Validators.required],
    endOdometer: ['', [Validators.required, Validators.min(0)]],
    totalAmount: [0, [Validators.required, Validators.min(0)]], // Summed Total (Auto)
    baseInvoiceAmount: [0, [Validators.required, Validators.min(0)]], // Base Bill
    paidAmount: [0, [Validators.required, Validators.min(0)]],  // Receipt
    driverEarnings: [0, [Validators.min(0)]],
    fuelCharges: [0, [Validators.min(0)]],
    tollParking: [0, [Validators.min(0)]],
    driverBata: [0, [Validators.min(0)]],
    permitAmount: [0, [Validators.min(0)]],
    // otherExpensesList: this.fb.array([]),


    tripType: ['Cash', Validators.required],
    guestComments: [''],
    paymentStatus: ['pending', Validators.required]
  });

  /*
  get otherExpensesArray() {
    return this.completeTripForm.get('otherExpensesList') as FormArray;
  }

  addOtherExpenseRow() {
    this.otherExpensesArray.push(this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeOtherExpenseRow(index: number) {
    this.otherExpensesArray.removeAt(index);
  }
  */


  private completeFormVal = toSignal(
    this.completeTripForm.valueChanges.pipe(startWith(this.completeTripForm.value))
  );

  totalKm = computed(() => {
    const start = this.activeTrip()?.startOdometer || 0;
    const end = this.completeFormVal()?.endOdometer || 0;
    const km = Number(end) - Number(start);
    return km > 0 ? km : 0;
  });

  balanceAmount = computed(() => {
    const f = this.completeFormVal();
    const active = this.activeTrip();
    if (!f || !active) return 0;
    const total = Number(f.totalAmount) || 0;
    const received = (Number(active.advanceAmount) || 0) + (Number(f.paidAmount) || 0);
    return Math.max(0, total - received);
  });

  totalOtherExpenses = computed(() => {
    /*
    const f = this.completeFormVal();
    if (!f || !f.otherExpensesList) return 0;
    return f.otherExpensesList.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
    */
    return 0;
  });


  driverSettlementAmount = computed(() => {
    const f = this.completeFormVal();
    const active = this.activeTrip();
    if (!f || !active) return 0;
    const collectedByDriver = Number(f.paidAmount) || 0;
    const driverExpenses = (Number(f.fuelCharges) || 0) + (Number(f.tollParking) || 0) + (Number(f.driverBata) || 0) + (Number(f.permitAmount) || 0) + this.totalOtherExpenses();
    const driverPayout = (Number(f.driverEarnings) || 0);
    // Settlement: Paid Cash (Closing) - Driver Expenses - Driver's Commission Earnings
    // Admin already received Advance directly.
    return collectedByDriver - driverExpenses - driverPayout;

  });


  currentVehiclePercentage = computed(() => {
    const activeTrip = this.activeTrip();
    if (activeTrip && activeTrip.vehicleId) {
      let vehIdStr = '';
      if (typeof activeTrip.vehicleId === 'object' && activeTrip.vehicleId !== null) {
        vehIdStr = activeTrip.vehicleId._id || activeTrip.vehicleId.id || '';
      } else {
        vehIdStr = activeTrip.vehicleId;
      }
      const vehicle = this.vehicles().find(v => v._id === vehIdStr);
      return vehicle?.driverPaymentPercentage ?? 20;
    }
    return 20;
  });

  ngOnInit() {
    this.loadInitialData();
    this.setupFormListeners();
  }

  setupFormListeners() {
    // Listen for changes in financial fields to determine tripType and earnings
    this.completeTripForm.valueChanges.subscribe(val => {
      const base = Number(val?.baseInvoiceAmount) || 0;
      const toll = Number(val?.tollParking) || 0;
      const bata = Number(val?.driverBata) || 0;
      const permit = Number(val?.permitAmount) || 0;

      // Rule: totalAmount = Sum of all components
      const total = base + toll + bata + permit;

      this.calculateDriverEarnings(base);

      // Auto-determine Trip Type (Cash vs Credit)
      const balance = this.balanceAmount();
      const cust = this.activeTripCustomer();
      const tripType = (balance > 0 && cust?.isEligibleForCredit) ? 'Credit' : 'Cash';

      const patchDetails: any = {
        tripType,
        totalAmount: total
      };
      if (balance === 0) {
        patchDetails.paymentStatus = 'paid';
      }

      this.completeTripForm.patchValue(patchDetails, { emitEvent: false });
    });

  }

  calculateDriverEarnings(baseInvoice: number) {
    let percentage = 0.2; // default 20%

    const activeTrip = this.activeTrip();
    if (activeTrip && activeTrip.vehicleId) {
      let vehIdStr = '';
      if (typeof activeTrip.vehicleId === 'object' && activeTrip.vehicleId !== null) {
        vehIdStr = activeTrip.vehicleId._id || activeTrip.vehicleId.id || '';
      } else {
        vehIdStr = activeTrip.vehicleId;
      }

      const vehicle = this.vehicles().find(v => v._id === vehIdStr);
      if (vehicle && vehicle.driverPaymentPercentage !== undefined) {
        percentage = (Number(vehicle.driverPaymentPercentage) || 0) / 100;
      }
    }

    let patchDetails: any = {
      driverEarnings: Number((baseInvoice * percentage).toFixed(2))
    };

    const cust = this.activeTripCustomer();
    if (!cust || !cust.isEligibleForCredit) {
      const advance = this.activeTrip()?.advanceAmount || 0;
      const toll = Number(this.completeTripForm.get('tollParking')?.value) || 0;
      const bata = Number(this.completeTripForm.get('driverBata')?.value) || 0;
      const permit = Number(this.completeTripForm.get('permitAmount')?.value) || 0;

      // If NOT credit, Customer should pay (Base + Toll + Bata + Permit - Advance)
      const totalToPay = baseInvoice + toll + bata + permit;
      patchDetails.paidAmount = Math.max(0, totalToPay - advance);
    }

    this.completeTripForm.patchValue(patchDetails, { emitEvent: false });
  }


  loadInitialData() {
    this.loading.set(true);
    this.tripService.getDriverTrips().subscribe({
      next: (trips) => {
        const active = trips.find(t => t.status === 'in-progress');
        this.activeTrip.set(active || null);

        const scheduled = trips.filter(t => t.status === 'scheduled');
        this.scheduledTrips.set(scheduled);

        const past = trips.filter(t => t.status !== 'in-progress' && t.status !== 'scheduled');
        this.pastTrips.set(past);
        this.historyTrips.set(past);

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.vehicleService.getVehicles().subscribe(v => {
      this.vehicles.set(v);
      const savedVehicle = localStorage.getItem('smarttaxi_selected_vehicle');
      if (savedVehicle && v.find(veh => veh._id === savedVehicle)) {
        this.selectedVehicleId.set(savedVehicle);
        this.startTripForm.patchValue({ vehicleId: savedVehicle });
      }
    });

    this.customerService.getAll().subscribe(c => this.customers.set(c));
  }

  onVehicleSelectChange(event: any) {
    const val = event.target.value;
    this.selectedVehicleId.set(val);
    if (val) {
      localStorage.setItem('smarttaxi_selected_vehicle', val);
    }
  }

  async showStartForm() {
    if (!this.selectedVehicleId()) {
      this.confirmDialog.title = 'Vehicle Selection';
      this.confirmDialog.message = 'Please select a vehicle from the fleet to start a trip.';
      this.confirmDialog.confirmText = 'OK';
      this.confirmDialog.type = 'info';
      await this.confirmDialog.open();
      return;
    }
    this.startTripForm.patchValue({ vehicleId: this.selectedVehicleId() });
    this.showStartTripForm.set(true);
  }

  onStartTrip() {
    if (this.startTripForm.invalid) return;

    this.loading.set(true);
    const formVal = this.startTripForm.value;

    const processTrip = (customerId: string, customerName: string) => {
      const data: Partial<Trip> = {
        vehicleId: formVal.vehicleId as string,
        customerId: customerId,
        customerName: customerName,
        startLocation: formVal.startLocation as string,
        startOdometer: Number(formVal.startOdometer),
        notes: formVal.notes || '',
        startTime: new Date().toISOString(),
        driverId: this.currentUser()?._id
      };

      this.tripService.createTrip(data).subscribe({
        next: (trip) => {
          this.activeTrip.set(trip);
          this.showStartTripForm.set(false);
          this.loading.set(false);
          this.startTripForm.reset({ vehicleId: this.selectedVehicleId() });
          this.loadInitialData();
        },
        error: () => this.loading.set(false)
      });
    };

    if (formVal.customerId === 'new') {
      const newCustomer = {
        name: formVal.newCustomerName as string,
        phone: formVal.newCustomerPhone as string,
        email: formVal.newCustomerEmail as string,
        address: formVal.newCustomerAddress as string
      };
      this.customerService.add(newCustomer as any).subscribe({
        next: (res) => {
          processTrip(res._id as string, res.name);
          this.customerService.getAll().subscribe(c => this.customers.set(c));
        },
        error: () => this.loading.set(false)
      });
    } else {
      const selectedCust = this.customers().find(c => c._id === formVal.customerId);
      processTrip(formVal.customerId as string, selectedCust?.name || 'Unknown');
    }
  }

  async startScheduledTrip(trip: Trip) {
    if (this.activeTrip()) {
      this.confirmDialog.title = 'Active Trip Conflict';
      this.confirmDialog.message = 'You already have an active trip in progress. Please complete it before starting a new one.';
      this.confirmDialog.confirmText = 'OK';
      this.confirmDialog.type = 'warning';
      await this.confirmDialog.open();
      return;
    }

    this.confirmDialog.title = 'Start Scheduled Trip';
    this.confirmDialog.message = `Are you sure you want to start the scheduled trip for ${trip.customerName}?`;
    this.confirmDialog.confirmText = 'Start Trip Now';
    this.confirmDialog.type = 'info';

    const confirmed = await this.confirmDialog.open();
    if (!confirmed) return;

    this.loading.set(true);
    const data: Partial<Trip> = {
      status: 'in-progress',
      startTime: new Date().toISOString(),
    };

    this.tripService.updateTrip(trip._id!, data).subscribe({
      next: (updatedTrip) => {
        this.activeTrip.set(updatedTrip);
        this.loadInitialData();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onCompleteTrip() {
    if (this.completeTripForm.invalid || !this.activeTrip()) return;

    this.loading.set(true);
    const tripId = this.activeTrip()?._id!;
    const endTime = new Date().toISOString();

    const start = new Date(this.activeTrip()!.startTime);
    const end = new Date(endTime);
    const hours = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 36e5);
    const days = Math.ceil(hours / 24);

    const formVal = this.completeTripForm.value;
    const data: Partial<Trip> = {
      endLocation: formVal.endLocation as string,
      endOdometer: Number(formVal.endOdometer),
      fuelCharges: Number(formVal.fuelCharges),
      tollParking: Number(formVal.tollParking),
      driverBata: Number(formVal.driverBata),
      otherExpenses: 0, // Hidden for now
      // otherExpensesList: formVal.otherExpensesList as any,
      advanceAmount: Number(this.activeTrip()?.advanceAmount || 0),

      paidAmount: Number(formVal.paidAmount),
      baseInvoiceAmount: Number(formVal.baseInvoiceAmount),
      permitAmount: Number(formVal.permitAmount),
      totalAmount: Number(formVal.totalAmount),
      driverEarnings: Number(formVal.driverEarnings),

      balanceAmount: this.balanceAmount(),
      driverSettlementAmount: this.driverSettlementAmount(),
      guestComments: formVal.guestComments || '',
      paymentStatus: formVal.paymentStatus as any,
      tripType: formVal.tripType as any,
      status: 'completed' as const,
      endTime,
      totalKm: this.totalKm(),
      totalHours: hours,
      totalDays: days,
      driverPaymentStatus: 'pending'
    };

    this.tripService.updateTrip(tripId, data).subscribe({
      next: () => {
        this.activeTrip.set(null);
        this.showCompleteTripForm.set(false);
        this.loadInitialData();
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
      // Open the adjustment UI instead of direct submit
      this.showAdjustmentUI.set(true);
      // Auto-select the first linked trip if available
      if (this.availableLinkedTrips().length > 0) {
        this.selectedAdjustmentTripId.set(this.availableLinkedTrips()[0]._id);

        // Calculate max possible adjustment
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
    this.adjustmentAmount.set(Number(event.target.value));
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

    // Update the current trip
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

        // Also update the previous trip with a note so the driver/admin can trace it
        const prevTripNote = `[SYSTEM] Balance Offset: Original ₹${Math.abs(prevTrip.driverSettlementAmount || 0)} - Applied ₹${amount} = Remaining ₹${Math.abs(newPrevSettlementAmount)}. Sent to offset trip for customer ${trip.customerName}.\n${prevTrip.notes || ''}`;

        // If the adjustment covers the full refund due, mark the previous trip as submitted too!
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
  }

  mathAbs(n: number | undefined): number {
    return Math.abs(n || 0);
  }

  closeTripDetail() {
    this.showTripDetail.set(false);
    this.showAdjustmentUI.set(false);
    this.selectedTrip.set(null);
  }
}

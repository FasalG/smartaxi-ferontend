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

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './driver-dashboard.html',
  styleUrls: ['./driver-dashboard.scss'],
})
export class DriverDashboard implements OnInit {
  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private customerService = inject(CustomerService);

  currentUser = this.authService.currentUser;

  activeTrip = signal<Trip | null>(null);
  pastTrips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  customers = signal<Customer[]>([]);
  selectedTrip = signal<Trip | null>(null);

  selectedVehicleId = signal<string>('');

  showStartTripForm = signal(false);
  showCompleteTripForm = signal(false);
  showHistory = signal(false);
  showTripDetail = signal(false);

  loading = signal(false);

  startTripForm = this.fb.group({
    vehicleId: ['', Validators.required],
    customerId: ['', Validators.required],
    newCustomerName: [''],
    newCustomerPhone: [''],
    newCustomerEmail: [''],
    newCustomerAddress: [''],
    visitingPlaces: ['', Validators.required],
    startLocation: ['', Validators.required],
    acType: ['A/C', Validators.required],
    startOdometer: ['', [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  completeTripForm = this.fb.group({
    endLocation: ['', Validators.required],
    endOdometer: ['', [Validators.required, Validators.min(0)]],
    totalAmount: [0, [Validators.required, Validators.min(0)]], // Invoice Bill
    paidAmount: [0, [Validators.required, Validators.min(0)]],  // Receipt
    driverEarnings: [0, [Validators.min(0)]],
    fuelCharges: [0, [Validators.min(0)]],
    tollParking: [0, [Validators.min(0)]],
    driverBata: [0, [Validators.min(0)]],
    otherExpensesList: this.fb.array([]),
    tripType: ['Cash', Validators.required],
    guestComments: [''],
    paymentStatus: ['pending', Validators.required]
  });

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
    const f = this.completeFormVal();
    if (!f || !f.otherExpensesList) return 0;
    return f.otherExpensesList.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  });

  driverSettlementAmount = computed(() => {
    const f = this.completeFormVal();
    const active = this.activeTrip();
    if (!f || !active) return 0;
    const collectedByDriver = (Number(active.advanceAmount) || 0) + (Number(f.paidAmount) || 0);
    const driverExpenses = (Number(f.fuelCharges) || 0) + (Number(f.tollParking) || 0) + (Number(f.driverBata) || 0) + this.totalOtherExpenses();
    const driverPayout = (Number(f.driverEarnings) || 0);
    // Settlement: Collected Cash - Driver Expenses - Driver's Commission Earnings
    return collectedByDriver - driverExpenses - driverPayout;
  });

  ngOnInit() {
    this.loadInitialData();
    this.setupFormListeners();
  }

  setupFormListeners() {
    this.completeTripForm.get('totalAmount')?.valueChanges.subscribe(val => {
      const amount = Number(val) || 0;
      this.completeTripForm.patchValue({
        driverEarnings: Number((amount * 0.2).toFixed(2))
      }, { emitEvent: false });
    });
  }

  loadInitialData() {
    this.loading.set(true);
    this.tripService.getDriverTrips().subscribe({
      next: (trips) => {
        const active = trips.find(t => t.status === 'in-progress');
        this.activeTrip.set(active || null);
        this.pastTrips.set(trips.filter(t => t.status !== 'in-progress'));
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

  showStartForm() {
    if (!this.selectedVehicleId()) {
      alert("Please select a vehicle first.");
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
        visitingPlaces: formVal.visitingPlaces as string,
        startLocation: formVal.startLocation as string,
        acType: formVal.acType as any,
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
          this.startTripForm.reset({ acType: 'A/C', vehicleId: this.selectedVehicleId() });
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

  onCompleteTrip() {
    if (this.completeTripForm.invalid || !this.activeTrip()) return;

    this.loading.set(true);
    const tripId = this.activeTrip()?._id!;
    const endTime = new Date().toISOString();

    // Calculate total hours
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
      otherExpenses: this.totalOtherExpenses(),
      otherExpensesList: formVal.otherExpensesList as any,
      advanceAmount: Number(this.activeTrip()?.advanceAmount || 0),
      paidAmount: Number(formVal.paidAmount),
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
      totalDays: days
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

  viewTripDetail(trip: Trip) {
    this.selectedTrip.set(trip);
    this.showTripDetail.set(true);
  }

  closeTripDetail() {
    this.showTripDetail.set(false);
    this.selectedTrip.set(null);
  }
}

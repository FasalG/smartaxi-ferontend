import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { Trip, Vehicle } from '../../../models/rental.models';
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

  currentUser = this.authService.currentUser;

  activeTrip = signal<Trip | null>(null);
  pastTrips = signal<Trip[]>([]);
  vehicles = signal<Vehicle[]>([]);
  selectedTrip = signal<Trip | null>(null);

  showStartTripForm = signal(false);
  showCompleteTripForm = signal(false);
  showHistory = signal(false);
  showTripDetail = signal(false);

  loading = signal(false);

  startTripForm = this.fb.group({
    vehicleId: ['', Validators.required],
    customerName: ['', Validators.required],
    visitingPlaces: ['', Validators.required],
    startLocation: ['', Validators.required],
    tripType: ['Cash', Validators.required],
    acType: ['A/C', Validators.required],
    startOdometer: ['', [Validators.required, Validators.min(0)]],
    notes: ['']
  });

  completeTripForm = this.fb.group({
    endLocation: ['', Validators.required],
    endOdometer: ['', [Validators.required, Validators.min(0)]],
    minimumCharges: [0, Validators.min(0)],
    extraKmCharges: [0, Validators.min(0)],
    extraHoursCharges: [0, Validators.min(0)],
    tollParking: [0, Validators.min(0)],
    permitTax: [0, Validators.min(0)],
    nightCharges: [0, Validators.min(0)],
    fuelCharges: [0, Validators.min(0)],
    advanceAmount: [0, Validators.min(0)],
    guestComments: [''],
    paymentStatus: ['pending', Validators.required]
  });

  private completeFormVal = toSignal(
    this.completeTripForm.valueChanges.pipe(startWith(this.completeTripForm.value))
  );

  totalKm = computed(() => {
    const start = this.activeTrip()?.startOdometer || 0;
    const end = this.completeFormVal()?.endOdometer || 0;
    const km = Number(end) - Number(start);
    return km > 0 ? km : 0;
  });

  totalAmount = computed(() => {
    const f = this.completeFormVal();
    if (!f) return 0;
    return (Number(f.minimumCharges) || 0) +
      (Number(f.extraKmCharges) || 0) +
      (Number(f.extraHoursCharges) || 0) +
      (Number(f.tollParking) || 0) +
      (Number(f.permitTax) || 0) +
      (Number(f.nightCharges) || 0) +
      (Number(f.fuelCharges) || 0);
  });

  balanceAmount = computed(() => {
    const total = this.totalAmount();
    const advance = Number(this.completeFormVal()?.advanceAmount) || 0;
    return total - advance;
  });

  ngOnInit() {
    this.loadInitialData();
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

    this.vehicleService.getVehicles().subscribe(v => this.vehicles.set(v));
  }

  onStartTrip() {
    if (this.startTripForm.invalid) return;

    this.loading.set(true);
    const formVal = this.startTripForm.value;
    const data: Partial<Trip> = {
      vehicleId: formVal.vehicleId as string,
      customerName: formVal.customerName as string,
      visitingPlaces: formVal.visitingPlaces as string,
      startLocation: formVal.startLocation as string,
      tripType: formVal.tripType as any,
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
        this.startTripForm.reset({ tripType: 'Cash', acType: 'A/C' });
      },
      error: () => this.loading.set(false)
    });
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
      minimumCharges: Number(formVal.minimumCharges),
      extraKmCharges: Number(formVal.extraKmCharges),
      extraHoursCharges: Number(formVal.extraHoursCharges),
      tollParking: Number(formVal.tollParking),
      permitTax: Number(formVal.permitTax),
      nightCharges: Number(formVal.nightCharges),
      fuelCharges: Number(formVal.fuelCharges),
      advanceAmount: Number(formVal.advanceAmount),
      guestComments: formVal.guestComments || '',
      paymentStatus: formVal.paymentStatus as any,
      status: 'completed' as const,
      endTime,
      totalKm: this.totalKm(),
      totalAmount: this.totalAmount(),
      balanceAmount: this.balanceAmount(),
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

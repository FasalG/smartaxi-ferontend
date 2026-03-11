import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboard {
  private tripService = inject(TripService);
  private vehicleService = inject(VehicleService);
  private fb = inject(FormBuilder);

  vehicles = signal<any[]>([]);
  trips = signal<any[]>([]);
  availabilityStatus = signal<'available' | 'unavailable' | null>(null);
  conflictingTrip = signal<any | null>(null);

  checkerForm = this.fb.group({
    vehicleId: ['', Validators.required],
    startTime: [new Date().toISOString().slice(0, 16), Validators.required],
    endTime: [new Date(Date.now() + 3600000).toISOString().slice(0, 16), Validators.required]
  });

  constructor() {
    this.vehicleService.getVehicles().subscribe(v => this.vehicles.set(v));
    this.tripService.getTrips().subscribe(t => this.trips.set(t));
  }

  checkAvailability() {
    if (this.checkerForm.invalid) return;

    const { vehicleId, startTime, endTime } = this.checkerForm.value as any;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    const conflict = this.trips().find(trip => {
      if (trip.vehicleId?._id !== vehicleId && trip.vehicleId !== vehicleId) return false;
      if (trip.status === 'cancelled') return false;

      const tStart = new Date(trip.startTime).getTime();
      const tEnd = trip.endTime ? new Date(trip.endTime).getTime() : Infinity;

      return (start < tEnd) && (end > tStart);
    });

    if (conflict) {
      this.availabilityStatus.set('unavailable');
      this.conflictingTrip.set(conflict);
    } else {
      this.availabilityStatus.set('available');
      this.conflictingTrip.set(null);
    }
  }
}

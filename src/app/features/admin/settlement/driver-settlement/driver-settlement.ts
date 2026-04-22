import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TripService } from '../../../../services/trip.service';
import { AuthService, User } from '../../../../services/auth.service';
import { VehicleService } from '../../../../services/vehicle.service';
import { Trip, Vehicle } from '../../../../models/rental.models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-driver-settlement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './driver-settlement.html',
  styleUrls: ['./driver-settlement.scss', '../settlement-reports.shared.scss'],
})
export class DriverSettlementComponent implements OnInit {
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private vehicleService = inject(VehicleService);
  private fb = inject(FormBuilder);

  drivers = signal<User[]>([]);
  vehicles = signal<Vehicle[]>([]);
  allTrips = signal<Trip[]>([]);
  loading = signal(false);
  today = new Date();

  filterForm = this.fb.group({
    driverId: [''],
    vehicleId: [''],
    startDate: [new Date().toISOString().split('T')[0]],
    endDate: [new Date().toISOString().split('T')[0]]
  });

  filteredTrips = computed(() => {
    const filters = this.filterForm.value;
    return this.allTrips().filter((trip: any) => {
      const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
      const matchDriver = !filters.driverId || 
        (typeof trip.driverId === 'object' ? trip.driverId._id === filters.driverId : trip.driverId === filters.driverId);
      const matchVehicle = !filters.vehicleId || 
        (typeof trip.vehicleId === 'object' ? trip.vehicleId._id === filters.vehicleId : trip.vehicleId === filters.vehicleId);
      const matchDate = tripDate >= (filters.startDate || '') && tripDate <= (filters.endDate || '');
      return matchDriver && matchVehicle && matchDate && trip.status === 'completed';
    });
  });

  stats = computed(() => {
    const trips = this.filteredTrips();
    const totalCollected = trips.reduce((sum, t) => sum + ((t.advanceAmount || 0) + (t.paidAmount || 0)), 0);
    const totalExpenses = trips.reduce((sum, t) => sum + this.getTripExpenses(t), 0);
    const netSettlement = trips.reduce((sum, t) => sum + (t.driverSettlementAmount || 0), 0);
    
    return {
      count: trips.length,
      collected: totalCollected,
      expenses: totalExpenses,
      net: netSettlement
    };
  });

  selectedDriverObj = computed(() => {
    return this.drivers().find(d => d._id === this.filterForm.value.driverId);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.authService.getDrivers().subscribe(d => this.drivers.set(d));
    this.vehicleService.getVehicles().subscribe(v => this.vehicles.set(v));
    this.tripService.getTrips().subscribe({
      next: (t) => {
        this.allTrips.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getTripExpenses(trip: any) {
    return (trip.fuelCharges || 0) + (trip.tollParking || 0) + (trip.driverBata || 0) + (trip.permitAmount || 0) + (trip.otherExpenses || 0);
  }

  mathAbs(n: number | undefined): number {
    return Math.abs(n || 0);
  }

  exportToExcel() {
    const data = this.filteredTrips().map(t => ({
      Date: new Date(t.startTime).toLocaleDateString(),
      Voucher: t._id?.slice(-6),
      Customer: t.customerName,
      'Trip Type': t.tripType,
      'Total Bill': t.totalAmount,
      'Cash Collected': (t.advanceAmount || 0) + (t.paidAmount || 0),
      'Fuel/Toll/Bata': this.getTripExpenses(t),
      'Net Settlement': t.driverSettlementAmount,
      Status: t.driverPaymentStatus
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Driver Settlement');
    XLSX.writeFile(wb, `Driver_Settlement_${this.selectedDriverObj()?.name || 'Report'}.xlsx`);
  }

  printReport() {
    window.print();
  }
}

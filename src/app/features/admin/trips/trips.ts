import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ExcelService } from '../../../services/excel.service';

@Component({
    selector: 'app-trips',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './trips.html',
})
export class TripsComponent {
    private formBuilder = inject(FormBuilder);
    private tripService = inject(TripService);
    private vehicleService = inject(VehicleService);
    private authService = inject(AuthService);
    private excelService = inject(ExcelService);

    trips = signal<any[]>([]);
    drivers = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    loading = false;
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    paginatedTrips = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.trips().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.trips().length / this.pageSize()));

    tripForm = this.formBuilder.group({
        driverId: ['', Validators.required],
        vehicleId: ['', Validators.required],
        customerName: ['', Validators.required],
        visitingPlaces: [''],
        startLocation: ['', Validators.required],
        endLocation: [''],
        startOdometer: [0],
        endOdometer: [0],
        totalKm: [0],
        minimumCharges: [0],
        extraKmCharges: [0],
        extraHoursCharges: [0],
        tollParking: [0],
        permitTax: [0],
        nightCharges: [0],
        fuelCharges: [0],
        advanceAmount: [0],
        totalAmount: [0],
        balanceAmount: [0],
        status: ['in-progress', Validators.required],
        paymentStatus: ['pending']
    });

    constructor() {
        this.fetchTrips();
        this.fetchDrivers();
        this.fetchVehicles();
    }

    get f() { return this.tripForm.controls; }

    exportTrips() {
        this.excelService.exportToExcel(this.trips(), 'Trips');
    }

    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((trip: any) => {
                    const payload = {
                        driverId: trip.driverId || trip.DriverId,
                        vehicleId: trip.vehicleId || trip.VehicleId,
                        customerName: trip.customerName || trip.CustomerName,
                        visitingPlaces: trip.visitingPlaces || trip.VisitingPlaces || '',
                        startLocation: trip.startLocation || trip.StartLocation || 'Default',
                        startOdometer: Number(trip.startOdometer || trip.StartOdometer || 0),
                        status: 'in-progress' as const,
                        tenantId: this.authService.currentUser()?._id
                    };
                    this.tripService.createTrip(payload).subscribe({
                        next: () => this.fetchTrips()
                    });
                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
    }

    fetchTrips() {
        this.tripService.getTrips().subscribe({
            next: (res: any[]) => this.trips.set(res || []),
            error: (err: any) => console.error(err)
        });
    }

    fetchDrivers() {
        this.authService.getDrivers().subscribe({
            next: (res: any[]) => this.drivers.set(res || []),
            error: (err: any) => console.error(err)
        });
    }

    fetchVehicles() {
        this.vehicleService.getVehicles().subscribe({
            next: (res: any[]) => this.vehicles.set(res || []),
            error: (err: any) => console.error(err)
        });
    }

    toggleCreateForm() {
        this.isCreating = !this.isCreating;
        this.isEditing = false;
        this.editingId.set(null);
        if (!this.isCreating) {
            this.tripForm.reset({ status: 'in-progress', totalAmount: 0 });
        }
    }

    editTrip(trip: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(trip._id);
        this.tripForm.patchValue({
            driverId: trip.driverId?._id || trip.driverId,
            vehicleId: trip.vehicleId?._id || trip.vehicleId,
            customerName: trip.customerName,
            visitingPlaces: trip.visitingPlaces,
            startLocation: trip.startLocation,
            endLocation: trip.endLocation,
            startOdometer: trip.startOdometer,
            endOdometer: trip.endOdometer,
            totalKm: trip.totalKm,
            minimumCharges: trip.minimumCharges,
            extraKmCharges: trip.extraKmCharges,
            extraHoursCharges: trip.extraHoursCharges,
            tollParking: trip.tollParking,
            permitTax: trip.permitTax,
            nightCharges: trip.nightCharges,
            fuelCharges: trip.fuelCharges,
            advanceAmount: trip.advanceAmount,
            totalAmount: trip.totalAmount,
            balanceAmount: trip.balanceAmount,
            status: trip.status,
            paymentStatus: trip.paymentStatus
        });
    }

    deleteTrip(id: string) {
        if (confirm('Are you sure you want to delete this trip record?')) {
            this.tripService.deleteTrip(id).subscribe({
                next: () => this.fetchTrips(),
                error: (err) => console.error(err)
            });
        }
    }

    onSubmit() {
        if (this.tripForm.invalid) {
            this.tripForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload = {
            ...this.tripForm.value,
            tenantId: this.authService.currentUser()?._id
        } as any;

        const request = this.isEditing
            ? this.tripService.updateTrip(this.editingId()!, payload)
            : this.tripService.createTrip(payload);

        request.subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchTrips();
            },
            error: () => this.loading = false
        });
    }

    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

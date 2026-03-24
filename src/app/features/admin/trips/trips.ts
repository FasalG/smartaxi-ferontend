import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ExcelService } from '../../../services/excel.service';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
    selector: 'app-trips',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    templateUrl: './trips.html',
})
export class TripsComponent {
    private formBuilder = inject(FormBuilder);
    private tripService = inject(TripService);
    private vehicleService = inject(VehicleService);
    private authService = inject(AuthService);
    private excelService = inject(ExcelService);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    trips = signal<any[]>([]);
    drivers = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    loading = false;
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);
    searchQuery = signal<string>('');

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    filteredTrips = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const all = this.trips();
        if (!query) return all;
        return all.filter(t =>
            t.customerName?.toLowerCase().includes(query) ||
            t.driverId?.name?.toLowerCase().includes(query) ||
            t.vehicleId?.licensePlate?.toLowerCase().includes(query)
        );
    });

    paginatedTrips = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.filteredTrips().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.filteredTrips().length / this.pageSize()));

    tripForm = this.formBuilder.group({
        driverId: ['', Validators.required],
        vehicleId: ['', Validators.required],
        customerName: ['', Validators.required],
        startLocation: ['', Validators.required],
        endLocation: [''],
        startOdometer: [0],
        endOdometer: [0],
        totalKm: [0],
        tollParking: [0],
        fuelCharges: [0],
        driverBata: [0],
        otherExpenses: [0],
        advanceAmount: [0],
        totalAmount: [0],
        paidAmount: [0],
        balanceAmount: [0],
        driverEarnings: [0],
        driverSettlementAmount: [0],
        startTime: ['', Validators.required],
        endTime: [''],
        status: ['in-progress', Validators.required],
        paymentStatus: ['pending']
    });

    constructor() {
        this.fetchTrips();
        this.fetchDrivers();
        this.fetchVehicles();
        this.setupFormListeners();
    }

    setupFormListeners() {
        // Recalculate balance whenever total, advance, or paid amount changes
        this.tripForm.valueChanges.subscribe(() => {
            const formVal = this.tripForm.getRawValue();
            const total = Number(formVal.totalAmount) || 0;
            const advance = Number(formVal.advanceAmount) || 0;
            const paid = Number(formVal.paidAmount) || 0;
            const balance = total - (advance + paid);

            // Recalculate Driver Earnings based on vehicle percentage if provided
            const vehicleId = formVal.vehicleId;
            const vehicle = this.vehicles().find(v => v._id === vehicleId);
            const percentage = (vehicle?.driverPaymentPercentage || 20) / 100;
            const earnings = Math.round(total * percentage);

            // Driver Settlement = (Advance + Paid) - (Fuel + Toll + Bata + Other) - Earnings
            const fuel = Number(formVal.fuelCharges) || 0;
            const toll = Number(formVal.tollParking) || 0;
            const bata = Number(formVal.driverBata) || 0;
            const other = Number(formVal.otherExpenses) || 0;
            const settlement = (advance + paid) - (fuel + toll + bata + other) - earnings;

            this.tripForm.patchValue({
                balanceAmount: balance,
                driverEarnings: earnings,
                driverSettlementAmount: settlement
            }, { emitEvent: false });
        });
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
            const now = new Date();
            this.tripForm.reset({
                status: 'in-progress',
                totalAmount: 0,
                startTime: this.formatDateForInput(now)
            });
        }
    }

    formatDateForInput(date: string | Date): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().slice(0, 16); // format: yyyy-MM-ddTHH:mm
    }

    editTrip(trip: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(trip._id);
        this.tripForm.patchValue({
            driverId: trip.driverId?._id || trip.driverId,
            vehicleId: trip.vehicleId?._id || trip.vehicleId,
            customerName: trip.customerName || '',
            startLocation: trip.startLocation || '',
            endLocation: trip.endLocation,
            startOdometer: trip.startOdometer,
            endOdometer: trip.endOdometer,
            totalKm: trip.totalKm,
            tollParking: trip.tollParking,
            fuelCharges: trip.fuelCharges,
            driverBata: trip.driverBata,
            otherExpenses: trip.otherExpenses,
            advanceAmount: trip.advanceAmount,
            totalAmount: trip.totalAmount,
            paidAmount: trip.paidAmount,
            balanceAmount: trip.balanceAmount,
            driverEarnings: trip.driverEarnings,
            driverSettlementAmount: trip.driverSettlementAmount,
            startTime: this.formatDateForInput(trip.startTime),
            endTime: this.formatDateForInput(trip.endTime),
            status: trip.status,
            paymentStatus: trip.paymentStatus
        });
    }

    async deleteTrip(id: string) {
        this.confirmDialog.title = 'Delete Trip Record';
        this.confirmDialog.message = 'Are you sure you want to delete this trip record? This action cannot be undone.';
        this.confirmDialog.confirmText = 'Delete';
        this.confirmDialog.type = 'danger';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.tripService.deleteTrip(id).subscribe({
                next: () => this.fetchTrips(),
                error: (err) => console.error(err)
            });
        }
    }

    async onSubmit() {
        if (this.tripForm.invalid) {
            this.tripForm.markAllAsTouched();
            return;
        }

        const { vehicleId, startTime, endTime } = this.tripForm.value as any;
        const start = new Date(startTime).getTime();
        const end = endTime ? new Date(endTime).getTime() : Infinity;

        // Conflict Detection
        const hasConflict = this.trips().some(trip => {
            // Skip the trip being edited
            if (this.isEditing && trip._id === this.editingId()) return false;

            // Only check for the selected vehicle
            if (trip.vehicleId?._id !== vehicleId && trip.vehicleId !== vehicleId) return false;

            const tStart = new Date(trip.startTime).getTime();
            const tEnd = trip.endTime ? new Date(trip.endTime).getTime() : Infinity;

            // Check for overlap
            // (StartA <= EndB) and (EndA >= StartB)
            return (start < tEnd) && (end > tStart);
        });

        if (hasConflict) {
            this.confirmDialog.title = 'Vehicle Conflict';
            this.confirmDialog.message = 'This vehicle is already booked for the selected time range. Please choose another vehicle or time.';
            this.confirmDialog.confirmText = 'OK';
            this.confirmDialog.type = 'warning';
            await this.confirmDialog.open();
            return;
        }

        this.loading = true;

        const formVal = this.tripForm.value as any;
        const now = Date.now();

        // If creating a new trip (not editing) and start time is > 1 min in future, 
        // default status to 'scheduled' even if 'in-progress' was selected.
        if (!this.isEditing && formVal.status === 'in-progress' && start > (now + 60000)) {
            formVal.status = 'scheduled';
        }

        const payload = {
            ...formVal,
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

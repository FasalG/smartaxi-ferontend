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
    loading = signal(false);
    isCreating = signal(false);
    isEditing = signal(false);

    editingId = signal<string | null>(null);
    originalTripData = signal<any | null>(null);

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
        permitAmount: [0],
        otherExpenses: [0],
        advanceAmount: [0],
        baseInvoiceAmount: [0],
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
            const paid = Number(formVal.paidAmount) || 0; // First declaration of paid
            const balance = total - (advance + paid);

            // Recalculate Driver Earnings based on Base Invoice ONLY
            const vehicleId = formVal.vehicleId;
            const vehicle = this.vehicles().find(v => v._id === vehicleId);
            const percentage = (vehicle?.driverPaymentPercentage || 20) / 100;
            const baseAmount = Number(formVal.baseInvoiceAmount) || 0;
            const earnings = Math.round(baseAmount * percentage);

            // Driver Settlement = Paid (Customer Closing) - (Fuel + Toll + Bata + Permit + Other) - Commission
            // Advance is excluded because it's always received directly by the Admin.
            const fuel = Number(formVal.fuelCharges) || 0;
            const toll = Number(formVal.tollParking) || 0;
            const bata = Number(formVal.driverBata) || 0;
            const permit = Number(formVal.permitAmount) || 0;
            const other = Number(formVal.otherExpenses) || 0;
            const settlement = paid - (fuel + toll + bata + permit + other) - earnings;

            this.tripForm.patchValue({
                balanceAmount: balance,
                driverEarnings: earnings,
                driverSettlementAmount: settlement
            }, { emitEvent: false });

        });
    }

    get f() { return this.tripForm.controls; }
    private formatDateTime(date: any): string {
        if (!date) return 'N/A';
        const d = new Date(date);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    exportTrips() {
        const data = this.trips().map(t => ({
            'Trip Start': this.formatDateTime(t.startTime),
            'Trip End': this.formatDateTime(t.endTime),
            'Customer': t.customerName || 'N/A',
            'Driver': t.driverId?.name || 'N/A',
            'Vehicle': t.vehicleId ? `${t.vehicleId.make} ${t.vehicleId.model} (${t.vehicleId.licensePlate})` : 'N/A',
            'From': t.startLocation || '',
            'To': t.endLocation || '',
            'KM': t.totalKm || 0,
            'Amount': t.totalAmount || 0,
            'Status': t.status || 'in-progress'
        }));

        this.excelService.exportToExcel(data, 'Trips_List');
    }



    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((row: any) => {
                    // Map name/plate back to IDs
                    const driver = this.drivers().find(d =>
                        d.name?.toLowerCase().trim() === (row.Driver || row.driverId)?.toLowerCase().trim()
                    );
                    const vehicle = this.vehicles().find(v =>
                        v.licensePlate?.toLowerCase().trim() === (row.Vehicle || row.vehicleId)?.toLowerCase().trim()
                    );

                    const payload = {
                        driverId: driver?._id || row.driverId || row.Driver,
                        vehicleId: vehicle?._id || row.vehicleId || row.Vehicle,
                        customerName: row.Customer || row.customerName || 'N/A',
                        startLocation: row.From || row.startLocation || 'N/A',
                        startOdometer: Number(row['Start Odo'] || row.startOdometer || 0),
                        status: 'in-progress' as const,
                        tenantId: this.authService.currentUser()?._id
                    };

                    this.tripService.createTrip(payload).subscribe({
                        next: () => this.fetchTrips(),
                        error: (err) => console.error(err)
                    });

                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
    }


    fetchTrips() {
        this.loading.set(true);
        this.tripService.getTrips().subscribe({
            next: (res: any[]) => {
                this.trips.set(res || []);
                this.loading.set(false);
            },
            error: (err: any) => {
                console.error(err);
                this.loading.set(false);
            }
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
        this.isCreating.set(!this.isCreating());
        this.isEditing.set(false);
        this.editingId.set(null);
        this.originalTripData.set(null);
        if (!this.isCreating()) {
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
        // datetime-local input expects YYYY-MM-DDTHH:mm format in LOCAL time.
        // toISOString() returns UTC. We must adjust by the timezone offset.
        const timezoneOffset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    }


    editTrip(trip: any) {
        this.isEditing.set(true);
        this.isCreating.set(true);
        this.editingId.set(trip._id);
        this.originalTripData.set(trip);
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
            baseInvoiceAmount: trip.baseInvoiceAmount || 0,
            permitAmount: trip.permitAmount || 0,
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

        // Optimization: If editing, check if critical conflict-fields changed. 
        // If not, we don't need to re-validate conflicts with other trips.
        if (this.isEditing() && this.originalTripData()) {
            const orig = this.originalTripData();
            const origVehicleId = orig.vehicleId?._id || orig.vehicleId;

            const sameVehicle = String(origVehicleId) === String(vehicleId);
            // Use string comparison for time to avoid Timezone/ms mismatches
            const sameStart = this.formatDateForInput(orig.startTime) === startTime;

            if (sameVehicle && sameStart) {
                this.saveTrip();
                return;
            }
        }


        const hasConflict = this.trips().some(trip => {
            // 1. Skip the trip being edited (Robust String comparison)
            const tid = String(trip._id || '').toLowerCase();
            const eid = String(this.editingId() || '').toLowerCase();
            if (this.isEditing() && tid === eid) return false;



            // 2. Only check for the selected vehicle
            const tVehicleId = trip.vehicleId?._id || trip.vehicleId;
            if (String(tVehicleId) !== String(vehicleId)) return false;

            const tStart = new Date(trip.startTime).getTime();
            const tEnd = trip.endTime ? new Date(trip.endTime).getTime() : Infinity;

            // Check for overlap: (StartA < EndB) and (EndA > StartB)
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

        this.saveTrip();
    }

    private saveTrip() {
        this.loading.set(true);
        const formVal = this.tripForm.value as any;
        const now = Date.now();
        const start = new Date(formVal.startTime).getTime();

        // Auto-status for future 'in-progress' selections
        if (!this.isEditing() && formVal.status === 'in-progress' && start > (now + 60000)) {
            formVal.status = 'scheduled';
        }

        const payload = {
            ...formVal,
            tenantId: this.authService.currentUser()?._id
        } as any;

        const request = this.isEditing()
            ? this.tripService.updateTrip(this.editingId()!, payload)
            : this.tripService.createTrip(payload);

        request.subscribe({
            next: () => {
                this.loading.set(false);
                this.isCreating.set(false);
                this.isEditing.set(false);
                this.originalTripData.set(null);
                this.fetchTrips();
            },
            error: () => this.loading.set(false)
        });
    }



    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

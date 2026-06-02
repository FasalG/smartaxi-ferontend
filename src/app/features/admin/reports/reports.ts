import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../../services/trip.service';
import { VehicleService } from '../../../services/vehicle.service';
import { CustomerService } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExcelService } from '../../../services/excel.service';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './reports.html',
    styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit {
    private tripService = inject(TripService);
    private authService = inject(AuthService);
    private vehicleService = inject(VehicleService);
    private customerService = inject(CustomerService);
    private route = inject(ActivatedRoute);
    private excelService = inject(ExcelService);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    trips = signal<any[]>([]);
    drivers = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    customers = signal<any[]>([]);

    // Detail View
    selectedTrip = signal<any | null>(null);
    showTripDetail = signal<boolean>(false);
    approving = signal<boolean>(false);

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    // Filters
    filterDriverId = signal<string>('');
    filterVehicleId = signal<string>('');
    filterCustomerId = signal<string>('');
    filterStartDate = signal<string>('');
    filterEndDate = signal<string>('');

    filteredTrips = computed(() => {
        let list = this.trips();

        if (this.filterDriverId()) {
            list = list.filter(t => (t.driverId?._id || t.driverId) === this.filterDriverId());
        }

        if (this.filterVehicleId()) {
            list = list.filter(t => (t.vehicleId?._id || t.vehicleId) === this.filterVehicleId());
        }

        if (this.filterCustomerId()) {
            list = list.filter(t => (t.customerId?._id || t.customerId) === this.filterCustomerId());
        }

        if (this.filterStartDate()) {
            const start = new Date(this.filterStartDate());
            list = list.filter(t => new Date(t.startTime) >= start);
        }

        if (this.filterEndDate()) {
            const end = new Date(this.filterEndDate());
            end.setHours(23, 59, 59, 999);
            list = list.filter(t => new Date(t.startTime) <= end);
        }

        return list;
    });

    paginatedTrips = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.filteredTrips().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.filteredTrips().length / this.pageSize()));

    totalEarnings = computed(() => {
        return this.filteredTrips().reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    });

    totalKm = computed(() => {
        return this.filteredTrips().reduce((sum, t) => sum + (t.totalKm || 0), 0);
    });

    constructor() {
        this.fetchData();
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['driverId']) {
                this.filterDriverId.set(params['driverId']);
            }
        });
    }

    fetchData() {
        this.tripService.getTrips().subscribe(res => this.trips.set(res || []));
        this.authService.getDrivers().subscribe(res => this.drivers.set(res || []));
        this.vehicleService.getVehicles().subscribe(res => this.vehicles.set(res || []));
        this.customerService.getAll().subscribe(res => this.customers.set(res || []));
    }

    resetFilters() {
        this.filterDriverId.set('');
        this.filterVehicleId.set('');
        this.filterCustomerId.set('');
        this.filterStartDate.set('');
        this.filterEndDate.set('');
    }

    viewTripDetail(trip: any) {
        this.selectedTrip.set(trip);
        this.showTripDetail.set(true);
    }

    closeTripDetail() {
        this.showTripDetail.set(false);
        this.selectedTrip.set(null);
    }

    getTripApprovedExpenses(trip: any): number {
        if (!trip || !trip.linkedExpenses) return 0;
        return trip.linkedExpenses
            .filter((e: any) => e.status === 'approved')
            .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    }

    getTripRemaining(trip: any): number {
        if (!trip) return 0;
        if (trip.driverPaymentStatus === 'confirmed') return 0;
        const originalDues = (trip.driverSettlementAmount || 0) - (trip.driverSettlementPaidAmount || 0);
        const approvedExpenses = this.getTripApprovedExpenses(trip);
        return originalDues - approvedExpenses;
    }

    async confirmDriverPayment(trip: any) {
        const remaining = this.getTripRemaining(trip);
        const isRefund = remaining < 0;
        const amount = Math.abs(remaining);

        this.confirmDialog.title = isRefund ? 'Confirm Cash Refund' : 'Confirm Cash Receipt';
        this.confirmDialog.message = isRefund
            ? `Confirm you have given a cash refund of ₹${amount} to the driver? This will complete the settlement.`
            : `Confirm you have received the cash settlement of ₹${amount} from the driver? This will fully close the trip.`;
        this.confirmDialog.confirmText = isRefund ? 'Confirm Refund Given' : 'Confirm Receipt';
        this.confirmDialog.type = 'info';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.approving.set(true);
            const updateData: any = {
                driverPaymentStatus: 'confirmed',
                adminConfirmedAt: new Date().toISOString(),
                driverSettlementAmount: trip.driverSettlementPaidAmount || 0
            };

            // ONLY for Cash trips, finalize customer payment during driver confirmation
            if (trip.tripType !== 'Credit') {
                updateData.paymentStatus = 'paid';
                if (trip.paymentStatus === 'pending') {
                    updateData.paidAmount = (trip.totalAmount || 0) - (trip.advanceAmount || 0);
                    updateData.balanceAmount = 0;
                }
            }

            this.tripService.updateTrip(trip._id, updateData).subscribe({
                next: () => {
                    this.approving.set(false);
                    this.fetchData();
                    this.closeTripDetail();
                },
                error: () => this.approving.set(false)
            });
        }
    }

    mathAbs(n: number): number {
        return Math.abs(n || 0);
    }

    private formatDateTime(date: any): string {
        if (!date) return 'N/A';
        const d = new Date(date);
        // Returns format: MM/DD/YYYY, HH:MM AM/PM
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }


    printReport() {
        window.print();
    }

    exportReports() {
        const list = this.filteredTrips();
        const data = list.map(t => ({
            'Trip Start': this.formatDateTime(t.startTime),
            'Trip End': this.formatDateTime(t.endTime),
            'Customer': t.customerName || 'N/A',
            'Driver': t.driverId?.name || 'N/A',
            'Vehicle': t.vehicleId ? `${t.vehicleId.make} ${t.vehicleId.model} (${t.vehicleId.licensePlate})` : 'N/A',
            'Trip Type': t.tripType || 'Cash',
            'Total KM': t.totalKm || 0,
            'Trip Total': t.totalAmount || 0,
            'Base Invoice': t.baseInvoiceAmount || 0,
            'Advance (Customer)': t.advanceAmount || 0,
            'Paid (Customer)': t.paidAmount || 0,
            'Balance (Customer)': t.balanceAmount || 0,
            'Fuel': t.fuelCharges || 0,
            'Toll/Parking': t.tollParking || 0,
            'Bata': t.driverBata || 0,
            'Permit': t.permitAmount || 0,
            // 'Other Exp': t.otherExpenses || 0,


            'Driver Earnings': t.driverEarnings || 0,
            'Driver Settlement (Cash)': t.driverSettlementAmount || 0,
            'Settlement Mode': t.driverSettlementMethod || 'none',
            'Trip Status': t.status || '',
            'Settlement Status': t.driverPaymentStatus || '',
            'Notes': t.notes || ''
        }));
        this.excelService.exportToExcel(data, 'Trip_Reports_List');
    }




    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((trip: any) => {
                    console.log('Imported Trip Data:', trip);
                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
    }

    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

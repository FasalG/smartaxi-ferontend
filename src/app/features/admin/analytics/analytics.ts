import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TripService } from '../../../services/trip.service';
import { CustomerService } from '../../../services/customer.service';
import { Trip } from '../../../models/rental.models';

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './analytics.html',
    styleUrls: ['./analytics.scss']
})
export class AnalyticsComponent implements OnInit {
    private tripService = inject(TripService);

    trips = signal<Trip[]>([]);
    loading = signal(true);

    // Detail View State
    selectedType = signal<'driver' | 'customer' | null>(null);
    selectedEntityId = signal<string | null>(null);
    selectedEntityName = signal<string>('');

    entityTrips = computed(() => {
        const type = this.selectedType();
        const id = this.selectedEntityId();
        const name = this.selectedEntityName();
        if (!type) return [];

        return this.trips().filter(t => {
            if (type === 'driver') {
                return t.driverId?._id === id || t.driverId === id;
            } else {
                // Check by customer name primarily since many trips might not have a formal customer ID link
                return (t.customerName === name) || (t.customerId?._id === id) || (t.customerId === id);
            }
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });


    // Global Analytics State
    analytics = computed(() => {
        const allTrips = this.trips();
        const completedTrips = allTrips.filter(t => t.status === 'completed');

        // Creditors Data
        const customerDues: Record<string, {
            name: string,
            totalDue: number,
            tripCount: number,
            totalBilled: number
        }> = {};

        let totalReceivables = 0;

        // Financial Overviews
        let totalRevenue = 0;
        let totalCashReceived = 0;

        // Expenses Tracking
        const expenses = {
            fuel: 0,
            toll: 0,
            bata: 0,
            permit: 0,
            other: 0,
            total: 0
        };

        // Driver Data (Detailed)
        const driverStats: Record<string, {
            id: string,
            name: string,
            tripCount: number,
            revenueBrought: number,
            expensesIncurred: number,
            advanceCollected: number,
            settlement: number
        }> = {};

        completedTrips.forEach(trip => {
            // 1. Debt logic
            const due = (Number(trip.totalAmount) || 0) - ((Number(trip.advanceAmount) || 0) + (Number(trip.paidAmount) || 0));
            const custName = (trip.customerId?.name) || trip.customerName || 'Unknown';

            if (!customerDues[custName]) {
                customerDues[custName] = { name: custName, totalDue: 0, tripCount: 0, totalBilled: 0 };
            }
            customerDues[custName].tripCount += 1;
            customerDues[custName].totalBilled += (Number(trip.totalAmount) || 0);

            if (due > 0) {
                customerDues[custName].totalDue += due;
                totalReceivables += due;
            }

            // 2. Global Totals
            totalRevenue += Number(trip.totalAmount) || 0;
            totalCashReceived += ((Number(trip.advanceAmount) || 0) + (Number(trip.paidAmount) || 0));

            // 3. Expenses
            expenses.fuel += Number(trip.fuelCharges) || 0;
            expenses.toll += Number(trip.tollParking) || 0;
            expenses.bata += Number(trip.driverBata) || 0;
            expenses.permit += Number(trip.permitTax) || 0;
            expenses.other += Number(trip.otherExpenses) || 0;

            // 4. Driver Stats
            if (trip.driverId) {
                const drName = trip.driverId.name || 'Unknown';
                if (!driverStats[trip.driverId._id]) {
                    driverStats[trip.driverId._id] = {
                        id: trip.driverId._id,
                        name: drName,
                        tripCount: 0,
                        revenueBrought: 0,
                        expensesIncurred: 0,
                        advanceCollected: 0,
                        settlement: 0
                    };
                }
                driverStats[trip.driverId._id].tripCount += 1;
                driverStats[trip.driverId._id].revenueBrought += Number(trip.totalAmount) || 0;

                const tripExpenses = (Number(trip.fuelCharges) || 0) + (Number(trip.tollParking) || 0) + (Number(trip.permitTax) || 0) + (Number(trip.driverBata) || 0) + (Number(trip.otherExpenses) || 0);
                driverStats[trip.driverId._id].expensesIncurred += tripExpenses;

                driverStats[trip.driverId._id].advanceCollected += ((Number(trip.advanceAmount) || 0) + (Number(trip.paidAmount) || 0));
                driverStats[trip.driverId._id].settlement += Number(trip.driverSettlementAmount) || 0;
            }
        });

        expenses.total = expenses.fuel + expenses.toll + expenses.bata + expenses.permit + expenses.other;

        const creditorsList = Object.values(customerDues).filter(c => c.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);
        const driverDataList = Object.values(driverStats).sort((a, b) => b.tripCount - a.tripCount);

        return {
            overview: {
                totalTrips: allTrips.length,
                ongoingTrips: allTrips.filter(t => t.status === 'in-progress').length,
                completedTrips: completedTrips.length,
                totalRevenue,
                totalCashReceived,
                totalReceivables
            },
            creditorsList,
            expenses,
            driverDataList
        };
    });

    ngOnInit() {
        this.tripService.getTrips().subscribe({
            next: (data) => {
                this.trips.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    parseNum(val: any): number {
        return Number(val) || 0;
    }

    viewDriverDetails(driverId: string, name: string) {
        this.selectedType.set('driver');
        this.selectedEntityId.set(driverId);
        this.selectedEntityName.set(name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    viewCustomerDetails(name: string) {
        this.selectedType.set('customer');
        this.selectedEntityId.set(null);
        this.selectedEntityName.set(name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    closeDetails() {
        this.selectedType.set(null);
        this.selectedEntityId.set(null);
        this.selectedEntityName.set('');
    }
}

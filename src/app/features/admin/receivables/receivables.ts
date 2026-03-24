import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { CustomerService } from '../../../services/customer.service';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
    selector: 'app-receivables',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent],
    templateUrl: './receivables.html',
    styles: [`
        .hover-bg-light:hover { background-color: var(--bs-light) !important; }
        .truncate-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    `]
})
export class ReceivablesComponent implements OnInit {
    private tripService = inject(TripService);
    private customerService = inject(CustomerService);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    trips = signal<any[]>([]);
    customers = signal<any[]>([]);
    loading = signal(true);
    expandedTrips = signal<Set<string>>(new Set());

    toggleExpand(tripId: string) {
        const current = new Set(this.expandedTrips());
        if (current.has(tripId)) {
            current.delete(tripId);
        } else {
            current.add(tripId);
        }
        this.expandedTrips.set(current);
    }

    processingId = signal<string | null>(null);

    async markAsPaid(trip: any) {
        this.confirmDialog.title = 'Clear Credit';
        this.confirmDialog.message = `Mark this credit of ₹${trip.balanceAmount} as closed and fully paid?`;
        this.confirmDialog.confirmText = 'Mark as Paid';
        this.confirmDialog.type = 'info';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.processingId.set(trip._id);
            const updateData = {
                paymentStatus: 'paid' as any,
                paidAmount: (trip.paidAmount || 0) + trip.balanceAmount,
                balanceAmount: 0,
                notes: (trip.notes || '') + `\n[${new Date().toLocaleString()}] Credit cleared by admin.`
            };

            this.tripService.updateTrip(trip._id, updateData).subscribe({
                next: () => {
                    this.processingId.set(null);
                    this.loadData();
                },
                error: () => this.processingId.set(null)
            });
        }
    }

    sortField = signal<'customer' | 'amount' | 'dueDate'>('dueDate');
    sortDirection = signal<'asc' | 'desc'>('asc');
    filterCustomer = signal<string>('');
    filterStatus = signal<'all' | 'in-period' | 'overdue'>('all');

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        this.customerService.getAll().subscribe(custs => {
            this.customers.set(custs);
            this.tripService.getTrips().subscribe(tripsData => {
                this.trips.set(tripsData);
                this.loading.set(false);
            });
        });
    }

    receivables = computed(() => {
        const allTrips = this.trips();
        const allCusts = this.customers();

        let recs = allTrips.filter(t => t.tripType === 'Credit' && t.balanceAmount > 0).map(t => {
            let custIdStr = '';
            if (typeof t.customerId === 'object' && t.customerId) {
                custIdStr = t.customerId._id || t.customerId.id;
            } else {
                custIdStr = t.customerId;
            }

            const customer = allCusts.find(c => c._id === custIdStr) || t.customerId;
            const creditDays = customer.creditPeriodDays || 0;
            const completionDate = t.endTime ? new Date(t.endTime) : new Date(t.updatedAt || t.startTime);

            // Add the credit days to completion date
            const dueDate = new Date(completionDate.getTime());
            dueDate.setDate(dueDate.getDate() + creditDays);

            const isOverdue = new Date() > dueDate;

            return {
                ...t,
                customerAssigned: customer,
                dueDate: dueDate,
                isOverdue: isOverdue,
                creditDays: creditDays
            };
        });

        // Search Filter
        if (this.filterCustomer().trim()) {
            const query = this.filterCustomer().toLowerCase();
            recs = recs.filter(r => r.customerName.toLowerCase().includes(query) || (r.customerAssigned?.name || '').toLowerCase().includes(query));
        }

        // Status Filter
        if (this.filterStatus() === 'in-period') {
            recs = recs.filter(r => !r.isOverdue);
        } else if (this.filterStatus() === 'overdue') {
            recs = recs.filter(r => r.isOverdue);
        }

        // Sorting
        recs.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (this.sortField() === 'amount') {
                valA = a.balanceAmount;
                valB = b.balanceAmount;
            } else if (this.sortField() === 'customer') {
                valA = a.customerName.toLowerCase();
                valB = b.customerName.toLowerCase();
            } else { // dueDate
                valA = a.dueDate.getTime();
                valB = b.dueDate.getTime();
            }

            if (valA < valB) return this.sortDirection() === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection() === 'asc' ? 1 : -1;
            return 0;
        });

        return recs;
    });

    totalReceivables = computed(() => {
        return this.receivables().reduce((sum, r) => sum + r.balanceAmount, 0);
    });

    overdueAmount = computed(() => {
        return this.receivables().filter(r => r.isOverdue).reduce((sum, r) => sum + r.balanceAmount, 0);
    });

    setSort(field: 'customer' | 'amount' | 'dueDate') {
        if (this.sortField() === field) {
            this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
        } else {
            this.sortField.set(field);
            this.sortDirection.set('asc');
        }
    }
}

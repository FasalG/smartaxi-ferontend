import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../services/customer.service';
import { TripService } from '../../../services/trip.service';
import { Customer } from '../../../models/rental.models';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
    selector: 'app-customers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    templateUrl: './customers.html',
    styleUrls: ['./customers.scss']
})
export class CustomersComponent implements OnInit {
    private customerService = inject(CustomerService);
    private tripService = inject(TripService);
    private fb = inject(FormBuilder);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    customers = signal<Customer[]>([]);
    trips = signal<any[]>([]);
    loading = signal(false);
    showForm = signal(false);
    isEditing = signal(false);
    selectedCustomerId = signal<string | null>(null);
    searchQuery = signal<string>('');

    filteredCustomers = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const all = this.customers().filter(c => !c.isGuest);
        if (!query) return all;
        return all.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query)
        );
    });


    // History View
    showHistory = signal(false);
    selectedCustomer = signal<Customer | null>(null);
    customerTrips = signal<any[]>([]);
    processingId = signal<string | null>(null);

    totalCustomerCredit = computed(() => {
        return this.customerTrips().reduce((sum, t) => sum + (t.balanceAmount || 0), 0);
    });

    customerForm = this.fb.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        email: [''],
        address: [''],
        isEligibleForCredit: [false],
        creditPeriodDays: [{ value: 0, disabled: true }, Validators.min(0)]
    });

    ngOnInit() {
        this.loadCustomers();

        this.customerForm.get('isEligibleForCredit')?.valueChanges.subscribe(isEligible => {
            const creditCtrl = this.customerForm.get('creditPeriodDays');
            if (isEligible) {
                creditCtrl?.enable();
            } else {
                creditCtrl?.disable();
                creditCtrl?.setValue(0);
            }
        });
    }

    loadCustomers() {
        this.loading.set(true);
        this.customerService.getAll().subscribe({
            next: (data) => {
                this.customers.set(data);
                this.tripService.getTrips().subscribe(tData => {
                    this.trips.set(tData);
                    this.loading.set(false);
                });
            },
            error: () => this.loading.set(false)
        });
    }

    openHistory(customer: Customer) {
        this.selectedCustomer.set(customer);
        const customerTrips = this.trips().filter(t => {
            let cid = typeof t.customerId === 'object' ? t.customerId?._id : t.customerId;
            return cid === customer._id;
        });
        this.customerTrips.set(customerTrips);
        this.showHistory.set(true);
    }

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
                notes: (trip.notes || '') + `\n[${new Date().toLocaleString()}] Credit cleared by admin via Customer Tab.`
            };

            this.tripService.updateTrip(trip._id, updateData).subscribe({
                next: () => {
                    this.processingId.set(null);
                    this.loadCustomers();
                    // Refresh local history view
                    const updated = this.customerTrips().map(t => t._id === trip._id ? { ...t, ...updateData } : t);
                    this.customerTrips.set(updated);
                },
                error: () => this.processingId.set(null)
            });
        }
    }

    onAdd() {
        this.isEditing.set(false);
        this.customerForm.reset();
        this.showForm.set(true);
    }

    onEdit(customer: Customer) {
        this.isEditing.set(true);
        this.selectedCustomerId.set(customer._id || null);
        this.customerForm.patchValue({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            isEligibleForCredit: customer.isEligibleForCredit || false,
            creditPeriodDays: customer.creditPeriodDays || 0
        });
        this.showForm.set(true);
    }

    onSubmit() {
        if (this.customerForm.invalid) return;
        this.loading.set(true);
        const val = this.customerForm.getRawValue() as Customer;

        if (this.isEditing() && this.selectedCustomerId()) {
            this.customerService.update({ ...val, _id: this.selectedCustomerId()! }).subscribe({
                next: () => {
                    this.loadCustomers();
                    this.showForm.set(false);
                },
                error: () => this.loading.set(false)
            });
        } else {
            this.customerService.add(val).subscribe({
                next: () => {
                    this.loadCustomers();
                    this.showForm.set(false);
                },
                error: () => this.loading.set(false)
            });
        }
    }

    async onDelete(id: string) {
        this.confirmDialog.title = 'Delete Customer';
        this.confirmDialog.message = 'Are you sure you want to delete this customer? All trip history will remain but the customer profile will be removed.';
        this.confirmDialog.confirmText = 'Delete';
        this.confirmDialog.type = 'danger';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.loading.set(true);
            this.customerService.delete(id).subscribe({
                next: () => this.loadCustomers(),
                error: () => this.loading.set(false)
            });
        }
    }
}

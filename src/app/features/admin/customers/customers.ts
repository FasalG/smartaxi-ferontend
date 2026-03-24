import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/rental.models';

@Component({
    selector: 'app-customers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './customers.html',
    styleUrls: ['./customers.scss']
})
export class CustomersComponent implements OnInit {
    private customerService = inject(CustomerService);
    private fb = inject(FormBuilder);

    customers = signal<Customer[]>([]);
    loading = signal(false);
    showForm = signal(false);
    isEditing = signal(false);
    selectedCustomerId = signal<string | null>(null);

    customerForm = this.fb.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        email: [''],
        address: ['']
    });

    ngOnInit() {
        this.loadCustomers();
    }

    loadCustomers() {
        this.loading.set(true);
        this.customerService.getAll().subscribe({
            next: (data) => {
                this.customers.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
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
            address: customer.address || ''
        });
        this.showForm.set(true);
    }

    onSubmit() {
        if (this.customerForm.invalid) return;
        this.loading.set(true);
        const val = this.customerForm.value as Customer;

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

    onDelete(id: string) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.loading.set(true);
            this.customerService.delete(id).subscribe({
                next: () => this.loadCustomers(),
                error: () => this.loading.set(false)
            });
        }
    }
}

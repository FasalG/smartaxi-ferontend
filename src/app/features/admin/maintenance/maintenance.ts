import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-maintenance',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './maintenance.html',
})
export class MaintenanceComponent {
    private formBuilder = inject(FormBuilder);
    private apiService = inject(ApiService);
    private authService = inject(AuthService);

    maintenanceRecords = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    loading = false;
    isCreating = false;

    maintenanceForm = this.formBuilder.group({
        vehicleId: ['', Validators.required],
        description: ['', Validators.required],
        cost: [0, [Validators.required, Validators.min(0)]],
        type: ['routine', Validators.required],
        status: ['completed', Validators.required],
        serviceDate: [new Date().toISOString().substring(0, 10), Validators.required],
        notes: ['']
    });

    constructor() {
        this.fetchMaintenanceRecords();
        this.fetchVehicles();
    }

    get f() { return this.maintenanceForm.controls; }

    fetchMaintenanceRecords() {
        this.apiService.HttpRequestHandler({
            method: HttpMethod.GET,
            endpoint: '/maintenance'
        }).subscribe({
            next: (res) => this.maintenanceRecords.set(res || []),
            error: (err) => console.error(err)
        });
    }

    fetchVehicles() {
        this.apiService.HttpRequestHandler({
            method: HttpMethod.GET,
            endpoint: '/vehicles'
        }).subscribe({
            next: (res) => this.vehicles.set(res || []),
            error: (err) => console.error(err)
        });
    }

    toggleCreateForm() {
        this.isCreating = !this.isCreating;
        if (!this.isCreating) {
            this.maintenanceForm.reset({
                type: 'routine',
                status: 'completed',
                serviceDate: new Date().toISOString().substring(0, 10),
                cost: 0
            });
        }
    }

    onSubmit() {
        if (this.maintenanceForm.invalid) {
            this.maintenanceForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload = {
            ...this.maintenanceForm.value,
            tenantId: this.authService.currentUser()?._id
        };

        this.apiService.HttpRequestHandler({
            method: HttpMethod.POST,
            endpoint: '/maintenance',
            body: payload
        }).subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchMaintenanceRecords();
            },
            error: () => this.loading = false
        });
    }
}

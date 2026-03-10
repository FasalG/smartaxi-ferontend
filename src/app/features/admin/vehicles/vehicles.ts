import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-vehicles',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './vehicles.html',
})
export class VehiclesComponent {
    private formBuilder = inject(FormBuilder);
    private apiService = inject(ApiService);
    private authService = inject(AuthService);

    vehicles = signal<any[]>([]);
    isCreating = false;
    loading = false;

    vehicleForm = this.formBuilder.group({
        make: ['', Validators.required],
        model: ['', Validators.required],
        licensePlate: ['', Validators.required],
        year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
        color: ['', Validators.required],
        status: ['active', Validators.required]
    });

    constructor() {
        this.fetchVehicles();
    }

    get f() { return this.vehicleForm.controls; }

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
            this.vehicleForm.reset({ year: new Date().getFullYear(), status: 'active' });
        }
    }

    onSubmit() {
        if (this.vehicleForm.invalid) {
            this.vehicleForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload = {
            ...this.vehicleForm.value,
            tenantId: this.authService.currentUser()?._id
        };

        this.apiService.HttpRequestHandler({
            method: HttpMethod.POST,
            endpoint: '/vehicles',
            body: payload
        }).subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchVehicles();
            },
            error: () => this.loading = false
        });
    }
}

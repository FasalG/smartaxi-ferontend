import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-drivers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './drivers.html',
})
export class DriversComponent {
    private formBuilder = inject(FormBuilder);
    private apiService = inject(ApiService);
    private authService = inject(AuthService);

    drivers = signal<any[]>([]);
    isCreating = false;
    loading = false;

    driverForm = this.formBuilder.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
    });

    constructor() {
        this.fetchDrivers();
    }

    get f() { return this.driverForm.controls; }

    fetchDrivers() {
        // This endpoint should be added to Endpoints and implemented on backend
        this.apiService.HttpRequestHandler({
            method: HttpMethod.GET,
            endpoint: '/auth/drivers' // Custom endpoint for this tenant's drivers
        }).subscribe({
            next: (res) => {
                this.drivers.set(res || []);
            },
            error: (err) => console.error(err)
        });
    }

    toggleCreateForm() {
        this.isCreating = !this.isCreating;
        if (!this.isCreating) {
            this.driverForm.reset();
        }
    }

    onSubmit() {
        if (this.driverForm.invalid) {
            this.driverForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload = {
            name: this.f.name.value,
            email: this.f.email.value,
            password: this.f.password.value,
            role: 'driver',
            tenantId: this.authService.currentUser()?._id // Current admin's ID
        };

        this.apiService.HttpRequestHandler({
            method: HttpMethod.POST,
            endpoint: '/auth/setup', // Re-using setup for driver creation
            body: payload
        }).subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchDrivers();
            },
            error: () => this.loading = false
        });
    }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-trips',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './trips.html',
})
export class TripsComponent {
    private formBuilder = inject(FormBuilder);
    private apiService = inject(ApiService);
    private authService = inject(AuthService);

    trips = signal<any[]>([]);
    drivers = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    loading = false;
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);

    tripForm = this.formBuilder.group({
        driverId: ['', Validators.required],
        vehicleId: ['', Validators.required],
        startLocation: ['', Validators.required],
        endLocation: [''],
        status: ['in-progress', Validators.required],
        fareAmount: [0, [Validators.required, Validators.min(0)]]
    });

    constructor() {
        this.fetchTrips();
        this.fetchDrivers();
        this.fetchVehicles();
    }

    get f() { return this.tripForm.controls; }

    fetchTrips() {
        this.apiService.HttpRequestHandler({
            method: HttpMethod.GET,
            endpoint: '/trips'
        }).subscribe({
            next: (res) => this.trips.set(res || []),
            error: (err) => console.error(err)
        });
    }

    fetchDrivers() {
        this.apiService.HttpRequestHandler({
            method: HttpMethod.GET,
            endpoint: '/auth/drivers'
        }).subscribe({
            next: (res) => this.drivers.set(res || []),
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
        this.isEditing = false;
        this.editingId.set(null);
        if (!this.isCreating) {
            this.tripForm.reset({ status: 'in-progress', fareAmount: 0 });
        }
    }

    editTrip(trip: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(trip._id);
        this.tripForm.patchValue({
            driverId: trip.driverId?._id || trip.driverId,
            vehicleId: trip.vehicleId?._id || trip.vehicleId,
            startLocation: trip.startLocation,
            endLocation: trip.endLocation,
            status: trip.status,
            fareAmount: trip.fareAmount
        });
    }

    deleteTrip(id: string) {
        if (confirm('Are you sure you want to delete this trip record?')) {
            this.apiService.HttpRequestHandler({
                method: HttpMethod.DELETE,
                endpoint: `/trips/${id}`
            }).subscribe({
                next: () => this.fetchTrips(),
                error: (err) => console.error(err)
            });
        }
    }

    onSubmit() {
        if (this.tripForm.invalid) {
            this.tripForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload = {
            ...this.tripForm.value,
            tenantId: this.authService.currentUser()?._id
        };

        const method = this.isEditing ? HttpMethod.PUT : HttpMethod.POST;
        const endpoint = this.isEditing ? `/trips/${this.editingId()}` : '/trips';

        this.apiService.HttpRequestHandler({
            method: method,
            endpoint: endpoint,
            body: payload
        }).subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchTrips();
            },
            error: () => this.loading = false
        });
    }
}

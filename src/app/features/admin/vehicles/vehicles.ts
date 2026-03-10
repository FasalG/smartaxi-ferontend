import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ExcelService } from '../../../services/excel.service';

@Component({
    selector: 'app-vehicles',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './vehicles.html',
})
export class VehiclesComponent {
    private formBuilder = inject(FormBuilder);
    private vehicleService = inject(VehicleService);
    private authService = inject(AuthService);
    private excelService = inject(ExcelService);

    vehicles = signal<any[]>([]);
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);
    loading = false;

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    paginatedVehicles = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.vehicles().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.vehicles().length / this.pageSize()));

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

    exportVehicles() {
        this.excelService.exportToExcel(this.vehicles(), 'Vehicles');
    }

    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((vehicle: any) => {
                    const payload = {
                        make: vehicle.make || vehicle.Make,
                        model: vehicle.model || vehicle.Model,
                        licensePlate: vehicle.licensePlate || vehicle.LicensePlate || vehicle.Plate,
                        year: Number(vehicle.year || vehicle.Year || new Date().getFullYear()),
                        color: vehicle.color || vehicle.Color,
                        status: (vehicle.status || vehicle.Status || 'active').toLowerCase(),
                        tenantId: this.authService.currentUser()?._id
                    };
                    this.vehicleService.createVehicle(payload).subscribe({
                        next: () => this.fetchVehicles()
                    });
                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
    }

    fetchVehicles() {
        this.vehicleService.getVehicles().subscribe({
            next: (res) => this.vehicles.set(res || []),
            error: (err) => console.error(err)
        });
    }

    toggleCreateForm() {
        this.isCreating = !this.isCreating;
        this.isEditing = false;
        this.editingId.set(null);
        if (!this.isCreating) {
            this.vehicleForm.reset({ year: new Date().getFullYear(), status: 'active' });
        }
    }

    editVehicle(vehicle: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(vehicle._id);
        this.vehicleForm.patchValue({
            make: vehicle.make,
            model: vehicle.model,
            licensePlate: vehicle.licensePlate,
            year: vehicle.year,
            color: vehicle.color,
            status: vehicle.status
        });
    }

    deleteVehicle(id: string) {
        if (confirm('Are you sure you want to delete this vehicle?')) {
            this.vehicleService.deleteVehicle(id).subscribe({
                next: () => this.fetchVehicles(),
                error: (err) => console.error(err)
            });
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
        } as any;

        const request = this.isEditing
            ? this.vehicleService.updateVehicle(this.editingId()!, payload)
            : this.vehicleService.createVehicle(payload);

        request.subscribe({
            next: () => {
                this.loading = false;
                this.toggleCreateForm();
                this.fetchVehicles();
            },
            error: () => this.loading = false
        });
    }

    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

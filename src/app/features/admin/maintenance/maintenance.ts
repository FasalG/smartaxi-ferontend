import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';
import { ExcelService } from '../../../services/excel.service';

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
    private excelService = inject(ExcelService);

    maintenanceRecords = signal<any[]>([]);
    vehicles = signal<any[]>([]);
    loading = false;
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    paginatedMaintenance = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.maintenanceRecords().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.maintenanceRecords().length / this.pageSize()));

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

    exportMaintenance() {
        this.excelService.exportToExcel(this.maintenanceRecords(), 'Maintenance_Records');
    }

    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((record: any) => {
                    const payload = {
                        vehicleId: record.vehicleId || record.VehicleId,
                        description: record.description || record.Description,
                        cost: Number(record.cost || record.Cost || 0),
                        type: record.type || record.Type || 'routine',
                        status: record.status || record.Status || 'completed',
                        serviceDate: record.serviceDate || record.ServiceDate || new Date().toISOString().substring(0, 10),
                        notes: record.notes || record.Notes || '',
                        tenantId: this.authService.currentUser()?._id
                    };
                    this.apiService.HttpRequestHandler({
                        method: HttpMethod.POST,
                        endpoint: '/maintenance',
                        body: payload
                    }).subscribe({
                        next: () => this.fetchMaintenanceRecords()
                    });
                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
    }

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
        this.isEditing = false;
        this.editingId.set(null);
        if (!this.isCreating) {
            this.maintenanceForm.reset({
                type: 'routine',
                status: 'completed',
                serviceDate: new Date().toISOString().substring(0, 10),
                cost: 0
            });
        }
    }

    editRecord(record: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(record._id);
        this.maintenanceForm.patchValue({
            vehicleId: record.vehicleId?._id || record.vehicleId,
            description: record.description,
            cost: record.cost,
            type: record.type,
            status: record.status,
            serviceDate: record.serviceDate ? new Date(record.serviceDate).toISOString().substring(0, 10) : '',
            notes: record.notes
        });
    }

    deleteRecord(id: string) {
        if (confirm('Are you sure you want to delete this maintenance record?')) {
            this.apiService.HttpRequestHandler({
                method: HttpMethod.DELETE,
                endpoint: `/maintenance/${id}`
            }).subscribe({
                next: () => this.fetchMaintenanceRecords(),
                error: (err) => console.error(err)
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

        const method = this.isEditing ? HttpMethod.PUT : HttpMethod.POST;
        const endpoint = this.isEditing ? `/maintenance/${this.editingId()}` : '/maintenance';

        this.apiService.HttpRequestHandler({
            method: method,
            endpoint: endpoint,
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

    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

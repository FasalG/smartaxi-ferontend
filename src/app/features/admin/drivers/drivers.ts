import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { ExcelService } from '../../../services/excel.service';

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
    private router = inject(Router);
    private excelService = inject(ExcelService);

    drivers = signal<any[]>([]);
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);
    loading = false;

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    paginatedDrivers = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.drivers().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.drivers().length / this.pageSize()));

    driverForm = this.formBuilder.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: [''], // Password optional during edit
    });

    constructor() {
        this.fetchDrivers();
    }

    get f() { return this.driverForm.controls; }

    exportDrivers() {
        this.excelService.exportToExcel(this.drivers(), 'Drivers');
    }

    onFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.excelService.importFromExcel(file).then((data) => {
                data.forEach((driver: any) => {
                    const payload: any = {
                        name: driver.name || driver.Name,
                        email: driver.email || driver.Email,
                        password: driver.password || driver.Password || '123456', // Default password for imported drivers
                        role: 'driver',
                        tenantId: this.authService.currentUser()?._id
                    };

                    this.apiService.HttpRequestHandler({
                        method: HttpMethod.POST,
                        endpoint: '/auth/setup',
                        body: payload
                    }).subscribe({
                        next: () => this.fetchDrivers()
                    });
                });
            }).catch(err => console.error('Error importing Excel:', err));
        }
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

    toggleCreateForm() {
        this.isCreating = !this.isCreating;
        this.isEditing = false;
        this.editingId.set(null);
        if (!this.isCreating) {
            this.driverForm.reset();
        }
    }

    editDriver(driver: any) {
        this.isEditing = true;
        this.isCreating = true;
        this.editingId.set(driver._id);
        this.driverForm.patchValue({
            name: driver.name,
            email: driver.email,
            password: ''
        });
    }

    deleteDriver(id: string) {
        if (confirm('Are you sure you want to delete this driver?')) {
            this.apiService.HttpRequestHandler({
                method: HttpMethod.DELETE,
                endpoint: `/auth/${id}`
            }).subscribe({
                next: () => this.fetchDrivers(),
                error: (err) => console.error(err)
            });
        }
    }

    onSubmit() {
        if (this.driverForm.invalid) {
            this.driverForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const payload: any = {
            name: this.f.name.value,
            email: this.f.email.value,
            role: 'driver',
            tenantId: this.authService.currentUser()?._id
        };

        if (this.f.password.value) {
            payload.password = this.f.password.value;
        }

        const method = this.isEditing ? HttpMethod.PUT : HttpMethod.POST;
        const endpoint = this.isEditing ? `/auth/${this.editingId()}` : '/auth/setup';

        this.apiService.HttpRequestHandler({
            method: method,
            endpoint: endpoint,
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

    viewDriverReport(driverId: string) {
        this.router.navigate(['/admin/reports'], { queryParams: { driverId } });
    }

    goToPage(p: number) {
        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

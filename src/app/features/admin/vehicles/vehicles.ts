import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleService } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ExcelService } from '../../../services/excel.service';
import { ViewChild } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';

@Component({
    selector: 'app-vehicles',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    templateUrl: './vehicles.html',
})
export class VehiclesComponent {
    private formBuilder = inject(FormBuilder);
    private vehicleService = inject(VehicleService);
    private authService = inject(AuthService);
    private excelService = inject(ExcelService);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    vehicles = signal<any[]>([]);
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);
    loading = false;
    searchQuery = signal<string>('');
    selectedComplianceId = signal<string | null>(null);


    // License Plate 4-cell logic
    plateCells = [
        signal(''), // KL
        signal(''), // 65
        signal(''), // D
        signal('')  // 3454
    ];

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    filteredVehicles = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const all = this.vehicles();
        if (!query) return all;
        return all.filter(v =>
            v.licensePlate?.toLowerCase().includes(query) ||
            v.make?.toLowerCase().includes(query) ||
            v.model?.toLowerCase().includes(query)
        );
    });

    paginatedVehicles = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.filteredVehicles().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.filteredVehicles().length / this.pageSize()));

    vehicleForm = this.formBuilder.group({
        make: ['', Validators.required],
        model: ['', Validators.required],
        licensePlate: ['', Validators.required],
        year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
        color: ['', Validators.required],
        status: ['active', Validators.required],
        driverPaymentPercentage: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
        registrationDate: [''],
        fitnessExpiry: [''],
        insuranceExpiry: [''],
        taxExpiry: [''],
        permitExpiry: [''],
        puccExpiry: ['']
    });


    constructor() {
        this.fetchVehicles();
    }

    onPlateCellInput(index: number, event: any) {
        const val = event.target.value.toUpperCase().trim();
        this.plateCells[index].set(val);

        // Auto-format the full plate: "KL 65 D 3454"
        const fullPlate = this.plateCells.map(s => s()).filter(v => v !== '').join(' ');
        this.vehicleForm.get('licensePlate')?.setValue(fullPlate);
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
                        driverPaymentPercentage: Number(vehicle.driverPaymentPercentage || vehicle.DriverPaymentPercentage || 20),
                        registrationDate: vehicle.registrationDate || vehicle['Reg Date'] || vehicle['RegDate'],
                        fitnessExpiry: vehicle.fitnessExpiry || vehicle['Fitness'] || vehicle['FitnessExpiry'],
                        insuranceExpiry: vehicle.insuranceExpiry || vehicle['Insurance'] || vehicle['InsuranceExpiry'],
                        taxExpiry: vehicle.taxExpiry || vehicle['Tax valid'] || vehicle['TaxExpiry'],
                        permitExpiry: vehicle.permitExpiry || vehicle['Permit'] || vehicle['PermitExpiry'],
                        puccExpiry: vehicle.puccExpiry || vehicle['PUCC'] || vehicle['PUCCExpiry'],
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
            this.plateCells.forEach(s => s.set(''));
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
            status: vehicle.status,
            driverPaymentPercentage: vehicle.driverPaymentPercentage || 20,
            registrationDate: this.formatDateForInput(vehicle.registrationDate),
            fitnessExpiry: this.formatDateForInput(vehicle.fitnessExpiry),
            insuranceExpiry: this.formatDateForInput(vehicle.insuranceExpiry),
            taxExpiry: this.formatDateForInput(vehicle.taxExpiry),
            permitExpiry: this.formatDateForInput(vehicle.permitExpiry),
            puccExpiry: this.formatDateForInput(vehicle.puccExpiry)
        });


        // Split existing plate into cells
        const parts = (vehicle.licensePlate || '').split(' ');
        this.plateCells[0].set(parts[0] || '');
        this.plateCells[1].set(parts[1] || '');
        this.plateCells[2].set(parts[2] || '');
        this.plateCells[3].set(parts[3] || '');
    }

    async deleteVehicle(id: string) {
        this.confirmDialog.title = 'Delete Vehicle';
        this.confirmDialog.message = 'Are you sure you want to delete this vehicle? This action cannot be undone.';
        this.confirmDialog.confirmText = 'Delete';
        this.confirmDialog.type = 'danger';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.vehicleService.deleteVehicle(id).subscribe({
                next: () => this.fetchVehicles(),
                error: (err) => console.error(err)
            });
        }
    }

    async onSubmit() {
        if (this.vehicleForm.invalid) {
            this.vehicleForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const val = this.vehicleForm.getRawValue();
        const plate = val.licensePlate?.trim().toUpperCase();

        // Duplicate check
        const isDuplicate = this.vehicles().some(v =>
            v.licensePlate?.trim().toUpperCase() === plate &&
            v._id !== this.editingId()
        );

        if (isDuplicate) {
            this.confirmDialog.title = 'Duplicate Plate';
            this.confirmDialog.message = `A vehicle with license plate ${plate} already exists.`;
            this.confirmDialog.confirmText = 'OK';
            this.confirmDialog.type = 'warning';
            await this.confirmDialog.open();
            this.loading = false;
            return;
        }

        const payload = {
            ...val,
            licensePlate: plate,
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

    formatDateForInput(date: any): string {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
    }

    getDaysLeft(date: any): number {
        if (!date) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(date);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getComplianceStatus(date: any): string {
        if (!date) return 'N/A';
        const days = this.getDaysLeft(date);
        if (days < 0) return 'Expired';
        if (days <= 30) return 'Warning';
        return 'On time';
    }

    getComplianceClass(date: any): string {
        if (!date) return '';
        const days = this.getDaysLeft(date);
        if (days < 0) return 'bg-danger text-white';
        if (days <= 30) return 'bg-warning text-dark';
        return 'bg-success text-white';
    }

    hasExpired(vehicle: any): boolean {
        return this.getComplianceGlobalStatus(vehicle) === 'danger';
    }

    getComplianceGlobalStatus(vehicle: any): string {
        if (!vehicle) return 'success';
        const dates = [
            vehicle.fitnessExpiry,
            vehicle.insuranceExpiry,
            vehicle.taxExpiry,
            vehicle.permitExpiry,
            vehicle.puccExpiry
        ];
        if (dates.some(d => d && this.getDaysLeft(d) < 0)) return 'danger';
        if (dates.some(d => d && this.getDaysLeft(d) <= 30)) return 'warning';
        return 'success';
    }

    goToPage(p: number) {



        if (p >= 1 && p <= this.totalPages()) {
            this.page.set(p);
        }
    }
}

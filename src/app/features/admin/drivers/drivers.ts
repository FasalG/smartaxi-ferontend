import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { ExcelService } from '../../../services/excel.service';
import { ViewChild, AfterViewInit } from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../../../core/configs/firebase.config';

@Component({
    selector: 'app-drivers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    templateUrl: './drivers.html',
    styles: [`
        .letter-spacing-5 { letter-spacing: 0.5rem; }
        .max-w-400 { max-width: 400px; }
    `]
})

export class DriversComponent {
    private formBuilder = inject(FormBuilder);
    private apiService = inject(ApiService);
    private authService = inject(AuthService);
    private router = inject(Router);
    private excelService = inject(ExcelService);

    @ViewChild('confirmDialog') confirmDialog!: ConfirmDialogComponent;

    drivers = signal<any[]>([]);
    isCreating = false;
    isEditing = false;
    editingId = signal<string | null>(null);
    loading = false;
    searchQuery = signal<string>('');
    verifyEmail = signal<string>('');
    verifyPhone = signal<string>('');

    isEmailVerified = signal<boolean>(false);
    isPhoneVerified = signal<boolean>(false);
    emailOtpRequested = signal<boolean>(false);
    phoneOtpRequested = signal<boolean>(false);
    emailVerifyLoading = signal<boolean>(false);
    phoneVerifyLoading = signal<boolean>(false);

    // New computed signal for save button - Enables if Name, Email, Phone are valid AND (Email OR Phone is verified)
    canSave = computed(() => {
        const hasVerification = this.isEmailVerified() || this.isPhoneVerified();
        const essentialFieldsValid = this.f.name.valid && this.f.email.valid && this.f.phone.valid;
        return hasVerification && essentialFieldsValid && !this.loading;
    });


    private recaptchaVerifier: any;
    private confirmationResult: ConfirmationResult | null = null;

    // Pagination
    page = signal<number>(1);
    pageSize = signal<number>(10);

    filteredDrivers = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const all = this.drivers();
        if (!query) return all;
        return all.filter(d =>
            d.name?.toLowerCase().includes(query) ||
            d.email?.toLowerCase().includes(query)
        );
    });

    paginatedDrivers = computed(() => {
        const startIndex = (this.page() - 1) * this.pageSize();
        return this.filteredDrivers().slice(startIndex, startIndex + this.pageSize());
    });

    totalPages = computed(() => Math.ceil(this.filteredDrivers().length / this.pageSize()));

    driverForm = this.formBuilder.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
        password: [''], // Password optional during edit
        otp: ['']
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
        this.emailOtpRequested.set(false);
        this.phoneOtpRequested.set(false);
        this.isEmailVerified.set(false);
        this.isPhoneVerified.set(false);
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
            phone: driver.phone || '',
            password: ''
        });
        this.isEmailVerified.set(driver.isVerified || false);
        this.isPhoneVerified.set(driver.isVerified || false);
    }



    async deleteDriver(id: string) {
        this.confirmDialog.title = 'Delete Driver';
        this.confirmDialog.message = 'Are you sure you want to delete this driver? All driver credentials will be revoked.';
        this.confirmDialog.confirmText = 'Delete';
        this.confirmDialog.type = 'danger';

        const confirmed = await this.confirmDialog.open();
        if (confirmed) {
            this.apiService.HttpRequestHandler({
                method: HttpMethod.DELETE,
                endpoint: `/auth/${id}`
            }).subscribe({
                next: () => this.fetchDrivers(),
                error: (err) => console.error(err)
            });
        }
    }

    private setupRecaptcha() {
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
                this.recaptchaVerifier = null;
            } catch (e) { }
        }

        try {
            const container = document.getElementById('recaptcha-container');
            if (container) container.innerHTML = ''; // Clear previous renders

            this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    console.log('reCAPTCHA solved');
                },
                'expired-callback': () => {
                    console.warn('reCAPTCHA expired');
                    this.setupRecaptcha(); // Re-init on expiry
                }
            });
        } catch (error) {
            console.error('Error setting up reCAPTCHA:', error);
        }
    }


    async triggerPhoneVerification() {
        if (!this.f.phone.value) return;
        this.phoneVerifyLoading.set(true);
        this.setupRecaptcha();
        const phoneNumber = this.f.phone.value;
        const formattedPhone = phoneNumber?.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

        try {
            await this.recaptchaVerifier.render();
            signInWithPhoneNumber(auth, formattedPhone, this.recaptchaVerifier)
                .then((confirmationResult) => {
                    this.confirmationResult = confirmationResult;
                    this.phoneOtpRequested.set(true);
                    this.phoneVerifyLoading.set(false);
                })
                .catch((error) => {
                    console.error('SMS Send Error:', error);
                    this.phoneVerifyLoading.set(false);
                    alert('Error sending SMS: ' + error.message);
                });
        } catch (error) {
            console.error('reCAPTCHA Error:', error);
            this.phoneVerifyLoading.set(false);
        }
    }

    triggerEmailVerification() {
        if (!this.f.email.value) return;
        this.emailVerifyLoading.set(true);
        const email = this.f.email.value;

        this.apiService.HttpRequestHandler({
            method: HttpMethod.POST,
            endpoint: '/auth/request-verification',
            body: { email }
        }).subscribe({
            next: () => {
                this.emailVerifyLoading.set(false);
                this.emailOtpRequested.set(true);
                this.verifyEmail.set(email);
            },
            error: () => this.emailVerifyLoading.set(false)
        });
    }


    confirmEmailOTP() {
        const otp = this.f.otp.value;
        if (!otp) return;
        this.emailVerifyLoading.set(true);
        this.apiService.HttpRequestHandler({
            method: HttpMethod.POST,
            endpoint: '/auth/verify-otp',
            body: { email: this.verifyEmail(), otp }
        }).subscribe({
            next: () => {
                this.emailVerifyLoading.set(false);
                this.isEmailVerified.set(true);
                this.emailOtpRequested.set(false);
                this.driverForm.get('otp')?.reset();
            },
            error: () => this.emailVerifyLoading.set(false)
        });
    }

    confirmPhoneOTP() {
        const otp = this.f.otp.value;
        if (!otp || !this.confirmationResult) return;
        this.phoneVerifyLoading.set(true);
        this.confirmationResult.confirm(otp)
            .then(() => {
                this.phoneVerifyLoading.set(false);
                this.isPhoneVerified.set(true);
                this.phoneOtpRequested.set(false);
                this.driverForm.get('otp')?.reset();
            })
            .catch(() => {
                this.phoneVerifyLoading.set(false);
                alert('Invalid Phone OTP');
            });
    }

    onSubmit() {
        if (!this.canSave()) return;
        this.loading = true;

        const payload: any = {
            name: this.f.name.value,
            email: this.f.email.value,
            phone: this.f.phone.value,
            role: 'driver',
            tenantId: this.authService.currentUser()?._id,
            isVerified: true
        };

        if (this.f.password.value) {
            payload.password = this.f.password.value;
        }

        const method = this.isEditing ? HttpMethod.PUT : HttpMethod.POST;
        const endpoint = this.isEditing ? `/auth/${this.editingId()}` : '/auth/setup';

        this.apiService.HttpRequestHandler({
            method,
            endpoint,
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


    private updateDriver() {
        const payload: any = {
            name: this.f.name.value,
            email: this.f.email.value,
            phone: this.f.phone.value,
            role: 'driver',
            tenantId: this.authService.currentUser()?._id
        };

        if (this.f.password.value) {
            payload.password = this.f.password.value;
        }

        this.apiService.HttpRequestHandler({
            method: HttpMethod.PUT,
            endpoint: `/auth/${this.editingId()}`,
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

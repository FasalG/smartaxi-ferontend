import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Endpoints } from '../../../core/constants/endpoints';
import { HttpMethod } from '../../../core/enums/httpmethod.enum';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-dashboard.html',
  styleUrls: ['./superadmin-dashboard.scss'],
})
export class SuperadminDashboard {
  private formBuilder = inject(FormBuilder);
  private apiService = inject(ApiService);

  isCreating = false;
  loading = false;
  admins = signal<any[]>([]);

  adminForm = this.formBuilder.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    companyName: ['', Validators.required],
    companyAddress: ['', Validators.required],
    companyPhone: ['', Validators.required],
    companyGst: ['']
  });

  constructor() {
    this.fetchAdmins();
  }

  get f() { return this.adminForm.controls; }

  fetchAdmins() {
    this.apiService.HttpRequestHandler({
      method: HttpMethod.GET,
      endpoint: Endpoints.AUTH.GET_ADMINS
    }).subscribe({
      next: (admins) => {
        this.admins.set(admins || []);
      },
      error: (err) => {
        console.error('Error fetching admins:', err);
      }
    });
  }

  toggleCreateForm() {
    this.isCreating = !this.isCreating;
    if (!this.isCreating) {
      this.adminForm.reset();
    }
  }

  onSubmit() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      name: this.f.name.value,
      email: this.f.email.value,
      password: this.f.password.value,
      role: 'admin',
      companyDetails: {
        name: this.f.companyName.value,
        address: this.f.companyAddress.value,
        phone: this.f.companyPhone.value,
        gst_number: this.f.companyGst.value
      }
    };

    this.apiService.HttpRequestHandler({
      method: HttpMethod.POST,
      endpoint: Endpoints.AUTH.SETUP,
      body: payload
    }).subscribe({
      next: () => {
        this.loading = false;
        this.toggleCreateForm();
        this.fetchAdmins();
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

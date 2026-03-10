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
  isEditing = false;
  editingId = signal<string | null>(null);
  loading = false;
  admins = signal<any[]>([]);

  adminForm = this.formBuilder.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''], // Optional during edit
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
    this.isEditing = false;
    this.editingId.set(null);
    if (!this.isCreating) {
      this.adminForm.reset();
    }
  }

  editAdmin(admin: any) {
    this.isEditing = true;
    this.isCreating = true;
    this.editingId.set(admin._id);
    this.adminForm.patchValue({
      name: admin.name,
      email: admin.email,
      password: '',
      companyName: admin.companyDetails?.name || '',
      companyAddress: admin.companyDetails?.address || '',
      companyPhone: admin.companyDetails?.phone || '',
      companyGst: admin.companyDetails?.gst_number || ''
    });
  }

  deleteAdmin(id: string) {
    if (confirm('Are you sure you want to delete this administrator?')) {
      this.apiService.HttpRequestHandler({
        method: HttpMethod.DELETE,
        endpoint: `/auth/${id}`
      }).subscribe({
        next: () => this.fetchAdmins(),
        error: (err) => console.error(err)
      });
    }
  }

  onSubmit() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload: any = {
      name: this.f.name.value,
      email: this.f.email.value,
      role: 'admin',
      companyDetails: {
        name: this.f.companyName.value,
        address: this.f.companyAddress.value,
        phone: this.f.companyPhone.value,
        gst_number: this.f.companyGst.value
      }
    };

    if (this.f.password.value) {
      payload.password = this.f.password.value;
    }

    const method = this.isEditing ? HttpMethod.PUT : HttpMethod.POST;
    const endpoint = this.isEditing ? `/auth/${this.editingId()}` : Endpoints.AUTH.SETUP;

    this.apiService.HttpRequestHandler({
      method: method,
      endpoint: endpoint,
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

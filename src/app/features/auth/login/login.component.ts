import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light" style="background-color: var(--background) !important;">
      <div class="card shadow-lg border-0 rounded-4 overflow-hidden" style="max-width: 900px; width: 100%; min-height: 500px;">
        <div class="row g-0 h-100">
          
          <!-- Branding Side -->
          <div class="col-md-5 d-none d-md-block" style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); position: relative;">
            <div class="h-100 d-flex flex-column justify-content-center p-5 text-white">
              <h1 class="display-5 fw-bold mb-3">Zorta</h1>
              <p class="h5 fw-light text-white-50">Enterprise Rental Management</p>
              
              <div class="mt-auto">
                <p class="small text-white-50 mb-0">&copy; 2026 Zorta Systems</p>
              </div>
            </div>
            <!-- Decorative circle -->
            <div style="position: absolute; bottom: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
            <div style="position: absolute; top: 10%; left: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          </div>

          <!-- Login Form Side -->
          <div class="col-md-7 d-flex align-items-center bg-white">
            <div class="card-body p-4 p-lg-5 w-100">
              
              <div class="text-center mb-5 d-md-none">
                <h1 class="h3 fw-bold text-primary mb-1">Zorta</h1>
                <p class="text-secondary small">Rental Management</p>
              </div>

              <div class="mb-4">
                <h2 class="h4 fw-bold text-dark mb-1">Welcome Back</h2>
                <p class="text-secondary small">Please enter your credentials to login.</p>
              </div>

              <div *ngIf="error" class="alert alert-danger border-0 bg-danger text-white rounded-3 small py-2 d-flex align-items-center gap-2 mb-4" role="alert">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {{ error }}
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label small fw-bold text-secondary mb-1">Email Address</label>
                  <input type="email" class="form-control form-control-lg bg-light border-0" formControlName="email" placeholder="name@company.com" style="font-size: 0.95rem; border-radius: 12px; transition: all 0.3s;" [ngClass]="{'is-invalid': submitted && f['email'].errors}">
                  <div *ngIf="submitted && f['email'].errors" class="invalid-feedback small">
                    <div *ngIf="f['email'].errors['required']">Email is required</div>
                    <div *ngIf="f['email'].errors['email']">Email must be a valid email address</div>
                  </div>
                </div>
 
                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="form-label small fw-bold text-secondary mb-0">Password</label>
                    <a href="#" class="small text-decoration-none text-primary" (click)="$event.preventDefault()">Forgot password?</a>
                  </div>
                  <input type="password" class="form-control form-control-lg bg-light border-0" formControlName="password" placeholder="••••••••" style="font-size: 0.95rem; border-radius: 12px; transition: all 0.3s;" [ngClass]="{'is-invalid': submitted && f['password'].errors}">
                  <div *ngIf="submitted && f['password'].errors" class="invalid-feedback small">
                    <div *ngIf="f['password'].errors['required']">Password is required</div>
                  </div>
                </div>

                <button type="submit" [disabled]="loading" class="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm d-flex justify-content-center align-items-center gap-2" style="font-size: 1rem; letter-spacing: 0.5px;">
                  <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  {{ loading ? 'Signing in...' : 'Sign In' }}
                </button>
              </form>
              
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `,
    styles: [`
    .form-control:focus {
      background-color: white !important;
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
    }
  `]
})
export class LoginComponent {
    private formBuilder = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);

    loginForm = this.formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    loading = false;
    submitted = false;
    error = '';
    returnUrl = '';

    constructor() {
        // Redirect to home if already logged in
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/']);
        }

        // Get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }

    // Convenience getter for easy access to form fields
    get f() { return this.loginForm.controls; }

    onSubmit() {
        this.submitted = true;
        this.error = '';

        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;

        const credentials = {
            email: this.f.email.value,
            password: this.f.password.value
        };

        this.authService.login(credentials).subscribe({
            next: () => {
                this.router.navigateByUrl(this.returnUrl);
            },
            error: (error) => {
                this.error = error.error?.message || 'Login failed. Please check your credentials.';
                this.loading = false;
            }
        });
    }
}

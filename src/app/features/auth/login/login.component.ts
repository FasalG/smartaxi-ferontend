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
    <div class="login-page h-100vh overflow-hidden d-flex align-items-center justify-content-center">
      <div class="login-container shadow-2xl rounded-5 overflow-hidden">
        <div class="row g-0 h-100">
          
          <!-- BRANDING SIDE -->
          <div class="col-lg-5 d-none d-lg-block branding-side p-5 position-relative">
            <div class="branding-content h-100 d-flex flex-column">
              <div class="logo-area mb-auto">
                <div class="d-flex align-items-center gap-2">
                  <div class="brand-square"></div>
                  <span class="h3 fw-bold text-white mb-0 tracking-tight">SmartTaxi</span>
                </div>
                <p class="text-white opacity-50 small mt-1">Enterprise Fleet Intelligence</p>
              </div>
              
              <div class="branding-main mt-5">
                <h1 class="display-5 fw-extrabold text-white mb-3 tracking-tight">Advanced <span class="text-yellow">Logistics</span> Platform</h1>
                <p class="h5 fw-light text-white-50">Streamline your taxi operations with precision and speed.</p>
              </div>

              <div class="mt-auto quote-card p-4 rounded-4 backdrop-blur">
                <p class="text-white mb-0 font-italic small opacity-75">"The standard in smart transportation management."</p>
                <div class="d-flex align-items-center gap-2 mt-3">
                  <div class="avatar-sm"></div>
                  <span class="smaller text-white fw-medium">SmartTaxi Global</span>
                </div>
              </div>
            </div>
          </div>

          <!-- LOGIN FORM SIDE -->
          <div class="col-lg-7 bg-white p-4 p-xl-5 d-flex flex-column justify-content-center">
            <div class="form-wrapper mx-auto w-100 max-w-400">
              <div class="mb-5">
                <h2 class="h3 fw-bold text-dark mb-1">Secure Sign-In</h2>
                <p class="text-secondary small">Enter your SmartTaxi credentials to continue</p>
              </div>

              <div *ngIf="error" class="error-toast mb-4 p-3 rounded-3 d-flex align-items-center gap-2">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span class="smaller">{{ error }}</span>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
                <div class="mb-3">
                  <label class="form-label-custom">Personnel Email</label>
                  <div class="input-group">
                    <span class="input-group-text bg-light border-0 ps-3 pe-2">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                    </span>
                    <input type="email" class="form-control-custom" formControlName="email" placeholder="name@smarttaxi.com" [ngClass]="{'is-invalid': submitted && f['email'].errors}">
                  </div>
                  <div *ngIf="submitted && f['email'].errors" class="invalid-feedback-custom">
                    <span *ngIf="f['email'].errors['required']">Email is required</span>
                    <span *ngIf="f['email'].errors['email']">Enter a valid address</span>
                  </div>
                </div>

                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="form-label-custom mb-0">Password</label>
                    <a href="javascript:void(0)" class="forgot-pass-link">Support?</a>
                  </div>
                  <div class="input-group">
                    <span class="input-group-text bg-light border-0 ps-3 pe-2">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                    <input [type]="showPassword ? 'text' : 'password'" class="form-control-custom" formControlName="password" placeholder="••••••••" [ngClass]="{'is-invalid': submitted && f['password'].errors}">
                    <button type="button" class="btn border-0 bg-light text-secondary pe-3" (click)="togglePassword()">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path *ngIf="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path *ngIf="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        <path *ngIf="showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.228 0 2.391.218 3.46.613M15 12a3 3 0 01-3 3m3-3a3 3 0 00-3-3m3 3l3.5 3.5M9 9l-3.5-3.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="mb-4 d-flex align-items-center">
                  <input type="checkbox" class="form-check-input me-2 custom-check" id="remember">
                  <label class="smaller text-secondary fw-medium" for="remember">Keep me authorized</label>
                </div>

                <button type="submit" [disabled]="loading" class="btn-login-premium mt-2">
                  <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Authenticating...' : 'Sign In To Terminal' }}
                </button>
              </form>
              
              <div class="mt-5 pt-3 border-top text-center">
                <p class="smaller text-secondary mb-0">© 2026 SmartTaxi Management Systems</p>
                <p class="smaller text-secondary opacity-50">Authorized Personnel Only</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --navy: #0f172a;
      --yellow: #facc15;
      --accent-muted: #1e293b;
    }

    .h-100vh { height: 100vh; }

    .login-page {
      background: radial-gradient(circle at top left, #1e1b4b 0%, #0f172a 100%);
      padding: 0;
    }

    .login-container {
      max-width: 1100px;
      width: 90%;
      height: 600px;
      background: white;
    }

    .max-w-400 { max-width: 380px; }

    .branding-side {
      background: var(--navy);
      background-image: url('/smarttaxi-brand-v2.png');
      background-size: cover;
      background-position: center;
      position: relative;
    }
    
    .branding-side::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.98) 100%);
      z-index: 1;
    }

    .branding-content {
      position: relative;
      z-index: 2;
    }

    .brand-square {
      width: 24px;
      height: 24px;
      background: var(--yellow);
      border-radius: 6px;
      box-shadow: 0 0 20px rgba(250, 204, 21, 0.4);
    }

    .text-yellow { color: var(--yellow); }
    .fw-extrabold { font-weight: 800; }
    .tracking-tight { letter-spacing: -0.025em; }
    .smaller { font-size: 0.8rem; }
    .backdrop-blur { backdrop-filter: blur(10px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    .avatar-sm { width: 32px; height: 32px; background: var(--yellow); border-radius: 50%; opacity: 0.8; }

    .form-label-custom {
      display: block;
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .form-control-custom {
      border: 0;
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      border-radius: 0 12px 12px 0;
      font-size: 0.95rem;
      flex: 1;
      font-weight: 500;
      transition: all 0.2s;
    }

    .form-control-custom:focus {
      outline: 0;
      background: white;
      box-shadow: inset 0 0 0 2px var(--navy);
    }

    .input-group-text {
      border-radius: 12px 0 0 12px;
    }

    .btn-login-premium {
      width: 100%;
      background: var(--navy);
      color: white;
      border: 0;
      padding: 1.1rem;
      font-weight: 700;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-login-premium:hover:not(:disabled) {
      background: #000;
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.4);
    }

    .btn-login-premium:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .forgot-pass-link {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-decoration: none;
      transition: color 0.2s;
    }

    .forgot-pass-link:hover { color: var(--navy); }

    .custom-check:checked {
      background-color: var(--navy);
      border-color: var(--navy);
    }

    .error-toast {
      background: #fef2f2;
      color: #b91c1c;
      border-left: 4px solid #ef4444;
      font-weight: 600;
    }

    .invalid-feedback-custom {
      color: #ef4444;
      font-size: 0.72rem;
      font-weight: 700;
      margin-top: 0.35rem;
    }

    @media (max-width: 991.98px) {
      .login-container {
        height: auto;
        width: 95%;
        margin: 2rem 0;
      }
      .login-page {
        overflow-y: auto;
      }
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
  showPassword = false;
  error = '';
  returnUrl = '';

  constructor() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) return;

    this.loading = true;

    const credentials = {
      email: this.f.email.value,
      password: this.f.password.value
    };

    this.authService.login(credentials).subscribe({
      next: async (response) => {
        try {
          const role = response.user?.role;
          if (role === 'superadmin') {
            await this.router.navigateByUrl('/superadmin');
          } else if (role === 'admin') {
            await this.router.navigateByUrl('/admin');
          } else if (role === 'driver') {
            await this.router.navigateByUrl('/driver');
          } else {
            await this.router.navigateByUrl(this.returnUrl);
          }
        } catch (routeError) {
          this.error = 'Login succeeded, but routing failed: ' + routeError;
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Unauthorized: Invalid credentials';
        this.loading = false;
      }
    });
  }
}

# BizArabia Angular - Enterprise ERP Roadmap

## Executive Summary

**Current State:** 15% Complete - Foundation only
**Production Ready:** ❌ NO
**ERP Compliance:** ❌ NO (0/10)
**Timeline to Production:** 8-12 weeks

---

## Critical Issues (Must Fix Before Production)

### 🔴 CRITICAL #1: Zero Route Protection
**Issue:** Any unauthenticated user can access any route
```typescript
// Current (BROKEN)
const routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent }
];

// They can still access /accounts, /admin, etc by guessing URLs!
```

### 🔴 CRITICAL #2: No Auth Token Injection
**Issue:** Each service must manually add Authorization header
```typescript
// Current (Manual, Error-prone)
const headers = new HttpHeaders({
  'Authorization': `Bearer ${token}` // Must do this everywhere!
});
return this.http.get(url, { headers });
```

### 🔴 CRITICAL #3: No Role-Based Access Control
**Issue:** No permission system at all
```typescript
// Currently impossible:
- Can a user see this button? ❌ No way to know
- Can a user delete this record? ❌ No way to know
- What actions can this role perform? ❌ No way to know
```

### 🔴 CRITICAL #4: No Audit Logging
**Issue:** Fails ERP compliance requirements
```typescript
// Currently:
- Who changed this record? ❌ Unknown
- When was it changed? ❌ Unknown
- What changed? ❌ Unknown
// This is REQUIRED for ERPs (SOX, HIPAA, tax compliance)
```

---

## Priority 1: Auth Guard Implementation

### Step 1: Create Auth Guard
```typescript
// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Allow access
  }

  // Store redirect URL and navigate to login
  sessionStorage.setItem('redirectUrl', state.url);
  router.navigate(['/login']);
  return false;
};
```

### Step 2: Apply Guard to Routes
```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  
  // Protected routes - require auth
  { 
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'accounts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
  },
  
  // 404 route
  { path: '**', redirectTo: '/login' }
];
```

---

## Priority 2: HTTP Auth Interceptor

### Create Interceptor
```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get token from AuthService
    const token = this.authService.getToken();

    // Clone request and add Authorization header if token exists
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expired - try to refresh
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              // Retry original request with new token
              const newToken = this.authService.getToken();
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next.handle(clonedReq);
            }),
            catchError((refreshError) => {
              // Refresh failed - redirect to login
              this.authService.logout();
              this.router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
```

### Register Interceptor in App Config
```typescript
// src/app/app.config.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
```

---

## Priority 3: Role-Based Access Control (RBAC)

### Step 1: Extend Auth Service
```typescript
// src/app/core/auth/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[]; // ['admin', 'manager', 'accountant']
  permissions: string[]; // ['create_invoice', 'delete_ledger', etc]
  companyId: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  
  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const userJson = localStorage.getItem('current_user');
    if (userJson) {
      this.currentUserSignal.set(JSON.parse(userJson));
    }
  }

  getCurrentUser() {
    return this.currentUserSignal.asReadonly();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return user?.roles.includes(role) ?? false;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserSignal();
    return user?.permissions.includes(permission) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  hasAllRoles(roles: string[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  doLogin(username: string, password: string, companyId: number) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('companyID', companyId.toString());

    return this.http.post<any>('/authentication', formData).pipe(
      tap(response => {
        // Extract user from JWT or response
        const user: User = {
          id: response.userId,
          username: response.username,
          email: response.email,
          roles: response.roles || [],
          permissions: response.permissions || [],
          companyId: response.companyId
        };

        localStorage.setItem('auth_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        localStorage.setItem('current_user', JSON.stringify(user));
        
        this.currentUserSignal.set(user);
        this.router.navigate(['/dashboard']);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post('/authentication/refresh', { refreshToken }).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.accessToken);
      })
    );
  }
}
```

### Step 2: Create Role Guard
```typescript
// src/app/core/guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No role requirement
  }

  if (authService.hasAnyRole(requiredRoles)) {
    return true; // User has required role
  }

  // User doesn't have required role
  router.navigate(['/unauthorized']);
  return false;
};
```

### Step 3: Apply Role Guard to Routes
```typescript
// src/app/app.routes.ts
export const routes: Routes = [
  // ...
  {
    path: 'accounts',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'accountant'] }, // Only admins and accountants
    loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }, // Only admins
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'inventory',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'warehouse_manager'] }, // Admin or warehouse manager
    loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent)
  }
];
```

### Step 4: Use in Templates (Show/Hide UI)
```typescript
// In component
export class AccountsComponent {
  authService = inject(AuthService);
  currentUser = this.authService.getCurrentUser();

  // Check permission
  canDelete = computed(() => this.authService.hasPermission('delete_ledger'));
  canCreate = computed(() => this.authService.hasPermission('create_ledger'));
  isAdmin = computed(() => this.authService.hasRole('admin'));
}

// In template
<button [disabled]="!canDelete()">Delete</button>
<div *ngIf="isAdmin()">Admin only section</div>
<app-user-info [user]="currentUser()"></app-user-info>
```

---

## Priority 4: Global Error Handler

### Create Error Handler Service
```typescript
// src/app/core/services/error-handler.service.ts
import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr'; // or ngx-snackbar

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse): void {
    const chunkFailedMessage = /Loading chunk \d+ failed/g.regexp;
    
    if (chunkFailedMessage.test(error.message)) {
      // Reload app on chunk error (new deployment)
      window.location.reload();
    }

    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error);
    } else {
      this.handleClientError(error);
    }
  }

  private handleHttpError(error: HttpErrorResponse): void {
    const toastr = this.injector.get(ToastrService);
    let errorMessage = 'An error occurred';

    switch (error.status) {
      case 0:
        errorMessage = 'Network error. Check your connection.';
        break;
      case 400:
        errorMessage = error.error?.message || 'Invalid request';
        break;
      case 401:
        errorMessage = 'Session expired. Please login again.';
        break;
      case 403:
        errorMessage = 'Access denied';
        break;
      case 404:
        errorMessage = 'Resource not found';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      case 503:
        errorMessage = 'Service unavailable. Please try again later.';
        break;
      default:
        errorMessage = error.error?.message || errorMessage;
    }

    toastr.error(errorMessage);
    console.error('[HTTP Error]', error);
  }

  private handleClientError(error: Error): void {
    const toastr = this.injector.get(ToastrService);
    toastr.error('An unexpected error occurred');
    console.error('[Client Error]', error);
  }
}
```

### Register Error Handler
```typescript
// src/app/app.config.ts
import { ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from './core/services/error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};
```

---

## Priority 5: Audit Logging Service

### Create Audit Service
```typescript
// src/app/core/services/audit.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

export interface AuditLog {
  id?: string;
  userId: string;
  username: string;
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  entity: string; // 'Ledger', 'User', 'Invoice'
  entityId: string;
  changes?: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: Date;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  logAction(action: AuditLog): void {
    const user = this.authService.getCurrentUser();
    
    const log: AuditLog = {
      ...action,
      userId: user()?.id || 'unknown',
      username: user()?.username || 'unknown',
      timestamp: new Date(),
      ipAddress: this.getClientIp() // From request metadata
    };

    // Send to backend
    this.http.post('/api/audit-logs', log).subscribe({
      error: (err) => console.error('Failed to log audit', err)
    });
  }

  logCreateAction(entity: string, entityId: string, data: any): void {
    this.logAction({
      action: 'CREATE',
      entity,
      entityId,
      changes: this.objectToChanges(data),
      status: 'SUCCESS'
    });
  }

  logUpdateAction(entity: string, entityId: string, oldData: any, newData: any): void {
    this.logAction({
      action: 'UPDATE',
      entity,
      entityId,
      changes: this.getChanges(oldData, newData),
      status: 'SUCCESS'
    });
  }

  logDeleteAction(entity: string, entityId: string, data: any): void {
    this.logAction({
      action: 'DELETE',
      entity,
      entityId,
      changes: this.objectToChanges(data),
      status: 'SUCCESS'
    });
  }

  private getChanges(oldData: any, newData: any): AuditLog['changes'] {
    const changes: AuditLog['changes'] = [];
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes.push({
          fieldName: key,
          oldValue: oldData[key],
          newValue: newData[key]
        });
      }
    });
    return changes;
  }

  private objectToChanges(obj: any): AuditLog['changes'] {
    return Object.entries(obj).map(([key, value]) => ({
      fieldName: key,
      oldValue: null,
      newValue: value
    }));
  }

  private getClientIp(): string {
    // In real app, get from server
    return 'unknown';
  }
}
```

### Use in Components
```typescript
// In service
createLedger(data: any): Observable<any> {
  return this.api.request({...}).pipe(
    tap(response => {
      this.auditService.logCreateAction('Ledger', response.id, data);
    })
  );
}
```

---

## Implementation Timeline

### Week 1-2: Security Foundation
- [ ] Auth Guard (Day 1-2)
- [ ] HTTP Interceptor (Day 3-4)
- [ ] Role-Based Guards (Day 5-6)
- [ ] Update Routes (Day 7-10)

### Week 3: Error Handling & Logging
- [ ] Global Error Handler (Day 11-12)
- [ ] Audit Service (Day 13-14)
- [ ] Logging Service (Day 15)

### Week 4-6: Feature Development
- [ ] Layout Components (Week 4)
- [ ] Feature Module Routes (Week 4)
- [ ] Dashboard (Week 5)
- [ ] Forms & Validation (Week 5-6)

### Week 7-8: Testing & Refinement
- [ ] Unit Tests (Week 7)
- [ ] Integration Tests (Week 7)
- [ ] Performance Optimization (Week 8)
- [ ] Security Audit (Week 8)

---

## Checklist for Production Readiness

### Security (CRITICAL)
- [ ] Auth guard on all protected routes
- [ ] HTTP interceptor injecting tokens
- [ ] Role-based access control
- [ ] Token refresh mechanism
- [ ] No sensitive data in localStorage
- [ ] HTTPS only in production
- [ ] CORS properly configured
- [ ] CSP headers set

### Compliance (CRITICAL)
- [ ] Audit logging of all user actions
- [ ] User activity tracking
- [ ] Data change history
- [ ] Admin audit trail access

### Architecture (HIGH)
- [ ] Consistent API service pattern
- [ ] Global error handling
- [ ] Loading state management
- [ ] Feature modules with lazy loading
- [ ] Shared component library

### UI/UX (HIGH)
- [ ] Functional layout (header, sidebar)
- [ ] Error boundary component
- [ ] Loading spinner
- [ ] Toast notifications
- [ ] Responsive design

### Monitoring (MEDIUM)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] User analytics
- [ ] API monitoring

---

## Key Files to Create

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts ← CREATE
│   │   └── role.guard.ts ← CREATE
│   ├── interceptors/
│   │   ├── auth.interceptor.ts ← CREATE
│   │   ├── error.interceptor.ts ← CREATE (optional)
│   │   └── logging.interceptor.ts ← CREATE (optional)
│   ├── services/
│   │   ├── error-handler.service.ts ← CREATE
│   │   ├── audit.service.ts ← CREATE
│   │   ├── logger.service.ts ← CREATE
│   │   └── user-session.service.ts ← CREATE
│   └── auth/
│       └── auth.service.ts ← UPDATE (extend with roles/permissions)
├── shared/
│   ├── components/
│   │   ├── loading-spinner/
│   │   ├── error-boundary/
│   │   └── unauthorized/
│   ├── pipes/
│   │   ├── safe.pipe.ts
│   │   └── currency-format.pipe.ts
│   └── validators/
│       ├── email.validator.ts
│       └── password.validator.ts
└── app.routes.ts ← UPDATE (add guards and role data)
```

---

## Conclusion

Your project needs **foundational security and compliance work before production**. Following this roadmap will:
✅ Secure all routes
✅ Manage permissions properly
✅ Enable audit compliance
✅ Improve error UX
✅ Support enterprise ERP requirements

Estimated effort: **8-12 weeks with 2 developers**

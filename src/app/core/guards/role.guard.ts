import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
    return (route, state) => {
        const authService = inject(AuthService);
        const router = inject(Router);

        const currentUser = authService.currentUser();
        const role = currentUser?.role;
        const isAuth = authService.isAuthenticated();
        console.log('[RoleGuard] Checking roles. isAuth:', isAuth, 'role:', role, 'allowedRoles:', allowedRoles);

        if (isAuth && role && allowedRoles.includes(role)) {
            return true;
        }

        // If superadmin, redirect to superadmin. if admin to admin, etc.
        if (role === 'superadmin') {
            router.navigate(['/superadmin']);
        } else if (role === 'admin') {
            router.navigate(['/admin']);
        } else if (role === 'driver') {
            router.navigate(['/driver']);
        } else {
            if (state.url.startsWith('/admin')) {
                router.navigate(['/admin/login']);
            } else if (state.url.startsWith('/driver')) {
                router.navigate(['/driver/login']);
            } else {
                router.navigate(['/login']);
            }
        }

        return false;
    };
};

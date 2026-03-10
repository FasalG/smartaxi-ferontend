import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const isAuth = authService.isAuthenticated();
    console.log('[AuthGuard] Checking state.url:', state.url, 'isAuthenticated:', isAuth);

    if (isAuth) {
        return true;
    }

    // Redirect to appropriate login page based on the attempted url
    if (state.url.startsWith('/admin')) {
        router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
    } else if (state.url.startsWith('/driver')) {
        router.navigate(['/driver/login'], { queryParams: { returnUrl: state.url } });
    } else {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return false;
};

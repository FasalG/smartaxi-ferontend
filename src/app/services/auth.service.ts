import { Injectable, signal, inject } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';
import { StorageService } from '../core/services/storage.service';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    tenantId?: string | any;
    companyDetails?: any;
}

export interface AuthResponse {
    token: string;
    user: User;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private api = inject(ApiService);

    private storage = inject(StorageService);

    // Reactive state using Signals
    currentUser = signal<User | null>(this.getStoredUser());
    isAuthenticated = signal<boolean>(this.hasToken());

    constructor() { }

    login(credentials: any): Observable<AuthResponse> {
        return this.api.HttpRequestHandler<AuthResponse>({
            method: HttpMethod.POST,
            endpoint: Endpoints.AUTH.LOGIN,
            body: credentials
        }).pipe(
            tap(response => {
                console.log(response, 'response')

                this.setSession(response);
            }),
            catchError(error => {
                return throwError(() => error);
            })
        );
    }

    getMe(): Observable<User> {
        return this.api.HttpRequestHandler<User>({
            method: HttpMethod.GET,
            endpoint: Endpoints.AUTH.CURRENT_USER
        }).pipe(
            tap(user => {
                const storedUser = this.getStoredUser();
                if (storedUser) {
                    const updatedUser = { ...storedUser, ...user };
                    this.storage.setItem('zorta_user', updatedUser);
                    this.currentUser.set(updatedUser);
                }
            })
        );
    }

    getDrivers(): Observable<User[]> {
        return this.api.HttpRequestHandler<User[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.AUTH.GET_DRIVERS
        });
    }

    logout() {
        this.storage.removeItem('zorta_token');
        this.storage.removeItem('zorta_user');
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.api.clearAllCache();
    }

    getToken(): string | null {
        return this.storage.getItem('zorta_token', false);
    }

    private setSession(authResult: AuthResponse) {
        this.storage.setItem('zorta_token', authResult.token);
        this.storage.setItem('zorta_user', authResult.user);
        this.currentUser.set(authResult.user);
        this.isAuthenticated.set(true);
    }

    private getStoredUser(): User | null {
        return this.storage.getItem('zorta_user', true);
    }

    private hasToken(): boolean {
        return this.storage.hasItem('zorta_token');
    }
}

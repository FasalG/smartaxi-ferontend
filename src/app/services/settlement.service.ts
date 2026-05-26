import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';
import { DriverSettlement, Trip } from '../models/rental.models';

@Injectable({
    providedIn: 'root'
})
export class SettlementService {
    private api = inject(ApiService);

    getPendingTrips(): Observable<Trip[]> {
        return this.api.HttpRequestHandler<Trip[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.SETTLEMENTS.PENDING_TRIPS,
            cacheTags: ['pending-settlements']
        });
    }

    getDriverSettlements(): Observable<DriverSettlement[]> {
        return this.api.HttpRequestHandler<DriverSettlement[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.SETTLEMENTS.BASE,
            cacheTags: ['driver-settlements']
        });
    }

    submitSettlement(data: Partial<DriverSettlement>): Observable<DriverSettlement> {
        return this.api.HttpRequestHandler<DriverSettlement>({
            method: HttpMethod.POST,
            endpoint: Endpoints.SETTLEMENTS.BASE,
            body: data,
            invalidateTags: ['driver-settlements', 'pending-settlements', 'admin-settlements', 'trips', 'driver-trips']
        });
    }

    getAdminSettlements(): Observable<DriverSettlement[]> {
        return this.api.HttpRequestHandler<DriverSettlement[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.SETTLEMENTS.ADMIN,
            cacheTags: ['admin-settlements']
        });
    }

    approveSettlement(id: string, adminNotes: string): Observable<any> {
        return this.api.HttpRequestHandler({
            method: HttpMethod.PUT,
            endpoint: Endpoints.SETTLEMENTS.APPROVE(id),
            body: { adminNotes },
            invalidateTags: ['driver-settlements', 'pending-settlements', 'admin-settlements', 'trips', 'driver-trips']
        });
    }

    rejectSettlement(id: string, adminNotes: string): Observable<any> {
        return this.api.HttpRequestHandler({
            method: HttpMethod.PUT,
            endpoint: Endpoints.SETTLEMENTS.REJECT(id),
            body: { adminNotes },
            invalidateTags: ['driver-settlements', 'pending-settlements', 'admin-settlements', 'trips', 'driver-trips']
        });
    }
}

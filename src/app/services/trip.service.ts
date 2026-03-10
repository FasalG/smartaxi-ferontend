import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';
import { Trip } from '../models/rental.models';

@Injectable({
    providedIn: 'root'
})
export class TripService {
    private api = inject(ApiService);

    getTrips(): Observable<Trip[]> {
        return this.api.HttpRequestHandler<Trip[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.TRIPS.BASE,
            cacheTags: ['trips']
        });
    }

    getDriverTrips(): Observable<Trip[]> {
        return this.api.HttpRequestHandler<Trip[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.TRIPS.DRIVER,
            cacheTags: ['driver-trips']
        });
    }

    createTrip(tripData: Partial<Trip>): Observable<Trip> {
        return this.api.HttpRequestHandler<Trip>({
            method: HttpMethod.POST,
            endpoint: Endpoints.TRIPS.BASE,
            body: tripData,
            invalidateTags: ['trips', 'driver-trips']
        });
    }

    updateTrip(id: string, tripData: Partial<Trip>): Observable<Trip> {
        return this.api.HttpRequestHandler<Trip>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.TRIPS.BASE}/${id}`,
            body: tripData,
            invalidateTags: ['trips', 'driver-trips']
        });
    }

    deleteTrip(id: string): Observable<any> {
        return this.api.HttpRequestHandler({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.TRIPS.BASE}/${id}`,
            invalidateTags: ['trips', 'driver-trips']
        });
    }
}

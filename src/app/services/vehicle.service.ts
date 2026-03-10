import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';
import { Vehicle } from '../models/rental.models';

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private api = inject(ApiService);

    getVehicles(): Observable<Vehicle[]> {
        return this.api.HttpRequestHandler<Vehicle[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.VEHICLES.BASE,
            cacheTags: ['vehicles']
        });
    }

    createVehicle(vehicleData: Partial<Vehicle>): Observable<Vehicle> {
        return this.api.HttpRequestHandler<Vehicle>({
            method: HttpMethod.POST,
            endpoint: Endpoints.VEHICLES.BASE,
            body: vehicleData,
            invalidateTags: ['vehicles']
        });
    }

    updateVehicle(id: string, vehicleData: Partial<Vehicle>): Observable<Vehicle> {
        return this.api.HttpRequestHandler<Vehicle>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.VEHICLES.BASE}/${id}`,
            body: vehicleData,
            invalidateTags: ['vehicles']
        });
    }

    deleteVehicle(id: string): Observable<any> {
        return this.api.HttpRequestHandler({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.VEHICLES.BASE}/${id}`,
            invalidateTags: ['vehicles']
        });
    }
}

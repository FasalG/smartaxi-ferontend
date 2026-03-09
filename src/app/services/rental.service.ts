import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Rental } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class RentalService {
    private api = inject(ApiService);
    private readonly cacheTag = 'rentals';

    getAll(): Observable<Rental[]> {
        return this.api.HttpRequestHandler<Rental[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.RENTALS.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<Rental> {
        return this.api.HttpRequestHandler<Rental>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.RENTALS.BASE}/${id}`,
        });
    }

    add(item: Rental): Observable<Rental> {
        return this.api.HttpRequestHandler<Rental>({
            method: HttpMethod.POST,
            endpoint: Endpoints.RENTALS.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: Rental): Observable<Rental> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<Rental>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.RENTALS.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.RENTALS.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }

    generateCode(prefix: string): string {
        return `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
}

import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Booking } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class BookingService {
    private api = inject(ApiService);
    private readonly cacheTag = 'bookings';

    getAll(): Observable<Booking[]> {
        return this.api.HttpRequestHandler<Booking[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.BOOKINGS.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<Booking> {
        return this.api.HttpRequestHandler<Booking>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.BOOKINGS.BASE}/${id}`,
        });
    }

    add(item: Booking): Observable<Booking> {
        return this.api.HttpRequestHandler<Booking>({
            method: HttpMethod.POST,
            endpoint: Endpoints.BOOKINGS.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: Booking): Observable<Booking> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<Booking>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.BOOKINGS.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.BOOKINGS.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }

    generateCode(prefix: string): string {
        return `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }

    downloadInvoice(id: string): Observable<Blob> {
        return this.api.HttpRequestHandler<Blob>({
            method: HttpMethod.GET,
            endpoint: Endpoints.BOOKINGS.INVOICE(id),
            responseType: 'blob'
        });
    }

    downloadReceipt(id: string): Observable<Blob> {
        return this.api.HttpRequestHandler<Blob>({
            method: HttpMethod.GET,
            endpoint: Endpoints.BOOKINGS.RECEIPT(id),
            responseType: 'blob'
        });
    }
}

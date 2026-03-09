import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { RentalItem } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private api = inject(ApiService);
    private readonly cacheTag = 'items';

    getAll(): Observable<RentalItem[]> {
        return this.api.HttpRequestHandler<RentalItem[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.INVENTORY.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<RentalItem> {
        return this.api.HttpRequestHandler<RentalItem>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.INVENTORY.BASE}/${id}`,
        });
    }

    add(item: RentalItem): Observable<RentalItem> {
        return this.api.HttpRequestHandler<RentalItem>({
            method: HttpMethod.POST,
            endpoint: Endpoints.INVENTORY.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    bulkAdd(items: RentalItem[]): Observable<RentalItem[]> {
        return this.api.HttpRequestHandler<RentalItem[]>({
            method: HttpMethod.POST,
            endpoint: Endpoints.INVENTORY.BULK,
            body: items,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: RentalItem): Observable<RentalItem> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<RentalItem>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.INVENTORY.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.INVENTORY.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }
}

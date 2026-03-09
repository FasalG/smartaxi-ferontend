import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class MaintenanceService {
    private api = inject(ApiService);
    private readonly cacheTag = 'maintenance';

    getAll(): Observable<any[]> {
        return this.api.HttpRequestHandler<any[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.MAINTENANCES.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.MAINTENANCES.BASE}/${id}`,
        });
    }

    add(item: any): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.POST,
            endpoint: Endpoints.MAINTENANCES.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: any): Observable<any> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.MAINTENANCES.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.MAINTENANCES.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }
}

import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Category } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private api = inject(ApiService);
    private readonly cacheTag = 'categories';

    getAll(): Observable<Category[]> {
        return this.api.HttpRequestHandler<Category[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.CATEGORIES.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<Category> {
        return this.api.HttpRequestHandler<Category>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.CATEGORIES.BASE}/${id}`,
        });
    }

    add(item: Category): Observable<Category> {
        return this.api.HttpRequestHandler<Category>({
            method: HttpMethod.POST,
            endpoint: Endpoints.CATEGORIES.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    bulkAdd(items: Category[]): Observable<Category[]> {
        return this.api.HttpRequestHandler<Category[]>({
            method: HttpMethod.POST,
            endpoint: `${Endpoints.CATEGORIES.BASE}/bulk`,
            body: items,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: Category): Observable<Category> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<Category>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.CATEGORIES.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.CATEGORIES.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }
}

import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Customer } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private api = inject(ApiService);
    private readonly cacheTag = 'customers';

    getAll(): Observable<Customer[]> {
        return this.api.HttpRequestHandler<Customer[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.CUSTOMERS.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    getById(id: string): Observable<Customer> {
        return this.api.HttpRequestHandler<Customer>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.CUSTOMERS.BASE}/${id}`,
        });
    }

    add(item: Customer): Observable<Customer> {
        return this.api.HttpRequestHandler<Customer>({
            method: HttpMethod.POST,
            endpoint: Endpoints.CUSTOMERS.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: Customer): Observable<Customer> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<Customer>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.CUSTOMERS.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.CUSTOMERS.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }

    generateCode(prefix: string): string {
        return `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
}

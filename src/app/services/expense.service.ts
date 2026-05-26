import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { Expense } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private api = inject(ApiService);
    private readonly cacheTag = 'expenses';

    getAll(): Observable<Expense[]> {
        return this.api.HttpRequestHandler<Expense[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.EXPENSES.BASE
        });
    }

    getById(id: string): Observable<Expense> {
        return this.api.HttpRequestHandler<Expense>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.EXPENSES.BASE}/${id}`,
        });
    }

    add(item: Expense): Observable<Expense> {
        return this.api.HttpRequestHandler<Expense>({
            method: HttpMethod.POST,
            endpoint: Endpoints.EXPENSES.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: Expense): Observable<Expense> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<Expense>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.EXPENSES.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    updateStatus(id: string, status: 'approved' | 'rejected'): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.EXPENSES.BASE}/${id}`,
            body: { status },
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.EXPENSES.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }

    getExpenseTypes(): Observable<string[]> {
        return this.api.HttpRequestHandler<string[]>({
            method: HttpMethod.GET,
            endpoint: `${Endpoints.EXPENSES.BASE}/types`
        });
    }

    addExpenseType(type: string): Observable<string[]> {
        return this.api.HttpRequestHandler<string[]>({
            method: HttpMethod.POST,
            endpoint: `${Endpoints.EXPENSES.BASE}/types`,
            body: { type }
        });
    }

    deleteExpenseType(type: string): Observable<string[]> {
        return this.api.HttpRequestHandler<string[]>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.EXPENSES.BASE}/types/${type}`
        });
    }

    generateCode(prefix: string): string {
        return `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
}

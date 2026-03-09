import { Injectable, inject } from '@angular/core';
import { ApiService } from '../core/services/api.service';
import { BankDetail } from '../models/rental.models';
import { Observable } from 'rxjs';
import { Endpoints } from '../core/constants/endpoints';
import { HttpMethod } from '../core/enums/httpmethod.enum';

@Injectable({
    providedIn: 'root'
})
export class BankDetailService {
    private api = inject(ApiService);
    private readonly cacheTag = 'bank-details';

    getAll(): Observable<BankDetail[]> {
        return this.api.HttpRequestHandler<BankDetail[]>({
            method: HttpMethod.GET,
            endpoint: Endpoints.BANK_DETAILS.BASE,
            cacheTags: [this.cacheTag]
        });
    }

    add(item: BankDetail): Observable<BankDetail> {
        return this.api.HttpRequestHandler<BankDetail>({
            method: HttpMethod.POST,
            endpoint: Endpoints.BANK_DETAILS.BASE,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    update(item: BankDetail): Observable<BankDetail> {
        const id = item._id || item.id;
        return this.api.HttpRequestHandler<BankDetail>({
            method: HttpMethod.PUT,
            endpoint: `${Endpoints.BANK_DETAILS.BASE}/${id}`,
            body: item,
            invalidateTags: [this.cacheTag]
        });
    }

    delete(id: string): Observable<any> {
        return this.api.HttpRequestHandler<any>({
            method: HttpMethod.DELETE,
            endpoint: `${Endpoints.BANK_DETAILS.BASE}/${id}`,
            invalidateTags: [this.cacheTag]
        });
    }
}

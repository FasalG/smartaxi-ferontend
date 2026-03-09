import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    Customer, Category, RentalItem, Rental, Invoice,
    Booking, Expense, Maintenance, Payment
} from '../models/rental.models';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private apiUrl = environment.apiUrl;

    private subjects = {
        customers: new BehaviorSubject<Customer[]>([]),
        categories: new BehaviorSubject<Category[]>([]),
        items: new BehaviorSubject<RentalItem[]>([]),
        rentals: new BehaviorSubject<Rental[]>([]),
        bookings: new BehaviorSubject<Booking[]>([]),
        invoices: new BehaviorSubject<Invoice[]>([]),
        expenses: new BehaviorSubject<Expense[]>([]),
        maintenance: new BehaviorSubject<Maintenance[]>([]),
        payments: new BehaviorSubject<Payment[]>([])
    };

    constructor(private http: HttpClient) {
        this.fetchAllData();
    }

    private fetchAllData() {
        this.refresh('customers');
        this.refresh('categories');
        this.refresh('items');
        this.refresh('rentals');
        this.refresh('bookings');
        this.refresh('invoices');
        this.refresh('expenses');
        this.refresh('maintenance');
    }

    private refresh(type: keyof typeof this.subjects) {
        this.http.get<any[]>(`${this.apiUrl}/${type}`).subscribe((data: any[]) => {
            (this.subjects as any)[type].next(data);
        });
    }

    // Generic CRUD
    getAll<T>(type: keyof typeof this.subjects): Observable<T[]> {
        // First approach: return the observable from the subject
        return this.subjects[type].asObservable() as Observable<T[]>;
    }

    add<T extends { id?: string }>(type: keyof typeof this.subjects, item: T): Observable<T> {
        return this.http.post<T>(`${this.apiUrl}/${type}`, item).pipe(
            tap(() => this.refresh(type))
        );
    }

    update<T extends { id?: string; _id?: string }>(type: keyof typeof this.subjects, item: T): Observable<T> {
        const id = item._id || item.id;
        return this.http.put<T>(`${this.apiUrl}/${type}/${id}`, item).pipe(
            tap(() => this.refresh(type))
        );
    }

    delete(type: keyof typeof this.subjects, id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${type}/${id}`).pipe(
            tap(() => this.refresh(type))
        );
    }

    // Helper to generate IDs or codes
    generateCode(prefix: string): string {
        return `${prefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
}

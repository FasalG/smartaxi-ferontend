import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, finalize, retry, timeout, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpMethod } from '../enums/httpmethod.enum';
import { ApiResponse } from '../models/commonapiresponse';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface HttpRequestConfig {
    method: HttpMethod;
    endpoint: string;
    params?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
    enableLogging?: boolean;
    retryAttempts?: number;
    requestTimeout?: number;
    cacheTags?: string[];
    invalidateTags?: string[];
    responseType?: 'json' | 'blob' | 'text' | 'arraybuffer';
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    // 1. Stores the actual data: "GET:/api/items" -> [Item A, Item B]
    private responseCache = new Map<string, any>();

    // 2. Maps Tags to Keys: "items" -> ["GET:/api/items"]
    private cacheTagMap = new Map<string, Set<string>>();

    private snackBar = inject(MatSnackBar);

    constructor(private http: HttpClient) {
        this.initializeLogging();
    }

    private initializeLogging(): void {
        console.log('[ApiService] Initialized with Tag-Based Caching');
    }

    /**
     * Execute HTTP request with Auto-Cache Invalidation
     */
    HttpRequestHandler<T = any>(config: HttpRequestConfig): Observable<T> {

        // --- STEP 1: INVALIDATE CACHE (Write Operations) ---
        if (config.invalidateTags && config.invalidateTags.length > 0) {
            this.clearCacheByTags(config.invalidateTags);
        }

        const uniqueRequestKey = this.generateCacheKey(config);

        // --- STEP 2: CHECK CACHE (Read Operations) ---
        if (config.method === HttpMethod.GET && config.cacheTags && config.cacheTags.length > 0) {
            if (this.responseCache.has(uniqueRequestKey)) {
                if (config.enableLogging) {
                    console.log(`[ApiService] ⚡ Cache HIT: ${uniqueRequestKey}`);
                }
                return of(this.responseCache.get(uniqueRequestKey));
            }
        }

        // --- STEP 3: PREPARE REQUEST ---
        const url = this.buildUrl(config.endpoint);
        const httpParams = this.buildHttpParams(config.params);

        const isFormData = config.body && (config.body instanceof FormData || (typeof config.body.append === 'function' && typeof config.body.delete === 'function'));

        const headers = this.buildHeaders(config.headers, isFormData);
        const requestOptions: any = { params: httpParams, headers };
        if (config.responseType) {
            requestOptions.responseType = config.responseType;
        }

        if (config.enableLogging) this.logRequest(config, url, isFormData);

        const retryCount = config.retryAttempts ?? 1;
        const timeoutMs = config.requestTimeout ?? 30000;

        let request$: Observable<any>;

        switch (config.method) {
            case HttpMethod.GET:
                request$ = this.http.get(url, requestOptions);
                break;
            case HttpMethod.POST:
                request$ = this.http.post(url, config.body || {}, requestOptions);
                break;
            case HttpMethod.PUT:
                request$ = this.http.put(url, config.body || {}, requestOptions);
                break;
            case HttpMethod.DELETE:
                request$ = this.http.delete(url, requestOptions);
                break;
            case HttpMethod.PATCH:
                request$ = this.http.patch(url, config.body || {}, requestOptions);
                break;
            default:
                return throwError(() => new Error(`Unsupported HTTP method: ${config.method}`));
        }

        // --- STEP 4: EXECUTE & SAVE TO CACHE ---
        return request$.pipe(
            timeout(timeoutMs),
            retry({ count: retryCount, delay: 1000 }),
            tap(response => {
                if (config.enableLogging) this.logResponse(config, response);

                // If it's a blob/file response, skip the success mapping
                if (config.responseType && config.responseType !== 'json') {
                    return;
                }

                const apiRes = response as ApiResponse<T>;

                // --- CENTRALIZED SNACKBAR LOGIC ---
                if (apiRes && apiRes.message) {
                    if (apiRes.success) {
                        this.showSuccess(apiRes.message);
                    } else {
                        this.showError(apiRes.message);
                    }
                } else if (apiRes && apiRes.success === false) {
                    this.showError(apiRes.error || 'An error occurred');
                }

                // If this was a cached request and succeeded, save the result and link it to the tags
                if (config.method === HttpMethod.GET && config.cacheTags && apiRes && apiRes.success) {
                    this.saveToCache(uniqueRequestKey, apiRes.data, config.cacheTags);
                }
            }),
            map(res => {
                // Automatically unwrap the data if success is true, otherwise throw error
                if (config.responseType && config.responseType !== 'json') {
                    return res as T;
                }
                const apiRes = res as ApiResponse<T>;
                if (apiRes && apiRes.success) {
                    return apiRes.data as T;
                }
                // If success is false, throw the entire response
                throw res;
            }),
            catchError(error => {
                if (config.enableLogging) this.logError(config, error);
                return this.handleError(error);
            })
        );
    }

    // ==========================================
    //  CACHE MANAGEMENT HELPERS
    // ==========================================

    private generateCacheKey(config: HttpRequestConfig): string {
        const paramString = config.params ? JSON.stringify(config.params) : '';
        return `${config.method}:${config.endpoint}:${paramString}`;
    }

    private saveToCache(key: string, data: any, tags: string[]) {
        this.responseCache.set(key, data);
        tags.forEach(tag => {
            if (!this.cacheTagMap.has(tag)) {
                this.cacheTagMap.set(tag, new Set<string>());
            }
            this.cacheTagMap.get(tag)?.add(key);
        });
    }

    private clearCacheByTags(tags: string[]) {
        tags.forEach(tag => {
            const keysToDelete = this.cacheTagMap.get(tag);
            if (keysToDelete) {
                keysToDelete.forEach(key => {
                    this.responseCache.delete(key);
                });
                this.cacheTagMap.delete(tag);
            }
        });
    }

    clearAllCache() {
        this.responseCache.clear();
        this.cacheTagMap.clear();
    }

    // ==========================================
    //  STANDARD HELPERS
    // ==========================================

    private buildUrl(endpoint: string): string {
        return endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
    }

    private buildHttpParams(params?: Record<string, any>): HttpParams {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach(key => {
                const value = params[key];
                if (value !== null && value !== undefined && value !== '') {
                    httpParams = httpParams.set(key, value.toString());
                }
            });
        }
        return httpParams;
    }

    private buildHeaders(customHeaders?: Record<string, string>, isFormData: boolean = false): HttpHeaders {
        let httpHeaders = isFormData ? new HttpHeaders() : new HttpHeaders({ 'Content-Type': 'application/json' });
        if (customHeaders) {
            Object.keys(customHeaders).forEach(key => httpHeaders = httpHeaders.set(key, customHeaders[key]));
        }
        return httpHeaders;
    }

    private handleError(error: HttpErrorResponse | any): Observable<never> {
        if (error.error && error.error.success === false && error.error.message) {
            this.showError(error.error.message);
        } else if (error.message && !error.error) {
            // Already a parsed error or network issue
            this.showError(error.message);
        } else {
            this.showError(error.error?.error || 'Unknown Error Occurred');
        }

        const errorResponse: ApiResponse = {
            success: false,
            statusCode: error.status || 500,
            error: error.error?.message || error.message || 'Unknown Error',
            timestamp: new Date()
        };
        return throwError(() => errorResponse);
    }

    private showSuccess(msg: string) {
        this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
    }

    private showError(msg: string) {
        this.snackBar.open(msg, 'Close', { duration: 4500, panelClass: ['bg-danger', 'text-white'] });
    }

    // ==========================================
    //  LOGGING HELPERS
    // ==========================================

    private logRequest(config: HttpRequestConfig, url: string, isFormData: boolean = false): void {
        console.groupCollapsed(`[Rest] ↗️ ${config.method} ${config.endpoint}`);
        console.log('URL:', url);
        console.log('Params:', config.params);
        if (isFormData && config.body) {
            const bodyObj: Record<string, any> = {};
            (config.body as FormData).forEach((value, key) => bodyObj[key] = value);
            console.log('Body (FormData):', bodyObj);
        } else {
            console.log('Body:', config.body);
        }
        console.groupEnd();
    }

    private logResponse(config: HttpRequestConfig, response: any): void {
        console.groupCollapsed(`[Rest] ↙️ ${config.method} ${config.endpoint} (Success)`);
        console.log('Data:', response);
        console.groupEnd();
    }

    private logError(config: HttpRequestConfig, error: any): void {
        console.error(`[Rest] ❌ ${config.method} ${config.endpoint} Failed`, error);
    }
}

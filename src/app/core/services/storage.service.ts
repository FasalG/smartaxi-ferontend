import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as CryptoJS from 'crypto-js';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private platformId = inject(PLATFORM_ID);

    // You can move this to an environment variable in production
    private readonly SECRET_KEY = 'smarttaxi_secure_storage_key_2026';

    constructor() { }

    /**
     * Set an item in localStorage with encryption
     * @param key The bare key to store under
     * @param value The value (object, string, etc) to encrypt and store
     */
    setItem(key: string, value: any): void {
        if (isPlatformBrowser(this.platformId)) {
            try {
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                const encryptedValue = CryptoJS.AES.encrypt(stringValue, this.SECRET_KEY).toString();
                localStorage.setItem(key, encryptedValue);
            } catch (error) {
                console.error(`Error saving to storage for key "${key}":`, error);
            }
        }
    }

    /**
     * Get and decrypt an item from localStorage
     * @param key The original key it was stored under
     * @param isJson Whether to parse the decrypted string back into a JSON object (default true)
     * @returns The decrypted and optionally parsed value, or null if it fails/missing
     */
    getItem(key: string, isJson: boolean = true): any | null {
        if (isPlatformBrowser(this.platformId)) {
            try {
                const encryptedValue = localStorage.getItem(key);
                if (!encryptedValue) return null;

                const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, this.SECRET_KEY);
                const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);

                if (!decryptedString) return null; // In case an old unencrypted token is stuck there causing decrypt failure

                if (isJson) {
                    return JSON.parse(decryptedString);
                }
                return decryptedString;
            } catch (error) {
                console.warn(`Error reading from storage for key "${key}". Clearing it.`, error);
                this.removeItem(key); // clear potentially corrupted/unencrypted data
                return null;
            }
        }
        return null;
    }

    /**
     * Remove a specific item from localStorage
     * @param key The key to remove
     */
    removeItem(key: string): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(key);
        }
    }

    /**
     * Clear all localStorage (careful with this one)
     */
    clear(): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.clear();
        }
    }

    /**
     * Check if a key exists
     */
    hasItem(key: string): boolean {
        if (isPlatformBrowser(this.platformId)) {
            return !!localStorage.getItem(key);
        }
        return false;
    }
}

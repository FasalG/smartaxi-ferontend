export const Endpoints = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        CURRENT_USER: '/auth/me',
        SETUP: '/auth/setup',
        GET_ADMINS: '/auth/admins',
        GET_DRIVERS: '/auth/drivers'
    },
    BOOKINGS: {
        BASE: '/bookings',
        INVOICE: (id: string) => `/bookings/${id}/invoice`,
        RECEIPT: (id: string) => `/bookings/${id}/receipt`
    },
    CATEGORIES: {
        BASE: '/categories'
    },
    CUSTOMERS: {
        BASE: '/customers'
    },
    EXPENSES: {
        BASE: '/expenses'
    },
    INVENTORY: {
        BASE: '/items',
        HISTORY: (id: string) => `/items/${id}/history`,
        BULK: '/items/bulk'
    },
    MAINTENANCES: {
        BASE: '/maintenance'
    },
    RENTALS: {
        BASE: '/rentals',
        INVOICE: (id: string) => `/rentals/${id}/invoice`
    },
    BANK_DETAILS: {
        BASE: '/bank-details'
    },
    ANALYTICS: {
        DASHBOARD: '/analytics/dashboard'
    },
    TRIPS: {
        BASE: '/trips',
        DRIVER: '/trips/driver'
    },
    VEHICLES: {
        BASE: '/vehicles'
    },
    SETTLEMENTS: {
        BASE: '/settlements',
        PENDING_TRIPS: '/settlements/pending-trips',
        ADMIN: '/settlements/admin',
        APPROVE: (id: string) => `/settlements/${id}/approve`,
        REJECT: (id: string) => `/settlements/${id}/reject`
    }
};

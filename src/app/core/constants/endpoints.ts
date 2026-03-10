export const Endpoints = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        CURRENT_USER: '/auth/me',
        SETUP: '/auth/setup',
        GET_ADMINS: '/auth/admins'
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
    }
};

export interface Category {
    _id?: string;
    id?: string;
    name: string;
    description?: string;
}

export interface Customer {
    _id?: string;
    id?: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    isEligibleForCredit?: boolean;
    creditPeriodDays?: number;
    isGuest?: boolean;
    tenantId?: any;

    createdAt?: string;
    updatedAt?: string;
}

export interface RentalItem {
    _id?: string;
    id?: string;
    item?: string;
    name: string;
    sku: string;
    category?: string;
    total_quantity: number;
    available_quantity: number;
    daily_rate: number;
    weekly_rate: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    status: 'available' | 'partial' | 'rented' | 'maintenance';
    description?: string;
    created_at: string;
}

export interface RentalUnit {
    _id?: string;
    id?: string;
    item: string;
    serial_number: string;
    is_available: boolean;
    condition: string;
}

export interface BankDetail {
    _id?: string;
    id?: string;
    account_holder: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    is_default: boolean;
}

export interface Booking {
    _id?: string;
    id?: string;
    booking_number: string;
    customer: any; // Populated or ID
    items: {
        item: string | RentalItem;
        quantity: number;
        rate: number;
    }[];
    start_date: string;
    end_date: string;
    duration_days: number;
    amount: number;
    initial_payment_received: number;
    payment_method: 'cash' | 'bank' | 'none';
    bank_detail?: string | BankDetail;
    status: 'pending' | 'active' | 'confirmed' | 'cancelled' | 'closed';
    created_at: string;
}

export interface Rental {
    _id?: string;
    id?: string;
    rental_number: string;
    customer: string;
    item: string;
    booking?: string;
    start_date: string;
    due_date: string;
    return_date?: string;
    duration_days: number;
    total_amount: number;
    paid_amount: number;
    payment_status: 'paid' | 'partial' | 'unpaid';
    status: 'active' | 'overdue' | 'returned' | 'extended';
    created_at: string;
}

export interface Invoice {
    _id?: string;
    id?: string;
    invoice_number: string;
    customer: string;
    rental: string;
    base_amount: number;
    gst_percentage: number;
    gst_amount: number;
    total_amount: number;
    paid_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    due_date: string;
    created_at: string;
}

export interface Payment {
    _id?: string;
    id?: string;
    invoice: string;
    amount: number;
    method: 'bank' | 'cash' | 'upi';
    transaction_id?: string;
    payment_date: string;
}

export interface Expense {
    _id?: string;
    id?: string;
    expense_number: string;
    category: 'maintenance' | 'fuel' | 'insurance' | 'utilities' | 'salary' | 'rent' | 'marketing' | 'other';
    description: string;
    vendor: string;
    amount: number;
    status: 'pending' | 'paid' | 'approved';
    expense_date: string;
    created_at: string;
    imageUrl?: string;
}

export interface Maintenance {
    _id?: string;
    item: string | RentalItem;
    description: string;
    scheduled_date: string;
    completed_date?: string;
    technician: string;
    priority: 'low' | 'medium' | 'high';
    cost: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
    created_at: string;
}

export interface Vehicle {
    _id?: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    status: 'active' | 'maintenance' | 'inactive';
    driverPaymentPercentage?: number;
}

export interface Trip {
    _id?: string;
    driverId: any;
    vehicleId: any;
    tenantId: string;
    startTime: string;
    endTime?: string;
    startLocation: string;
    endLocation?: string;
    customerId?: any;
    customerName: string;
    tripType: 'Cash' | 'Credit';
    startOdometer: number;
    endOdometer?: number;
    totalKm?: number;
    totalDays?: number;
    totalHours?: number;
    tollParking?: number;
    fuelCharges?: number;
    driverBata?: number;
    otherExpenses?: number;
    otherExpensesList?: { name: string, amount: number }[];
    advanceAmount?: number;
    driverAdvanceAmount?: number;
    baseInvoiceAmount?: number;
    permitAmount?: number;
    totalAmount?: number;

    balanceAmount?: number;
    paidAmount?: number;
    driverSettlementAmount?: number;
    driverSettlementPaidAmount?: number;
    submittedAmount?: number;
    driverEarnings?: number;
    guestComments?: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    paymentStatus: 'pending' | 'paid';
    driverPaymentStatus?: 'pending' | 'submitted' | 'confirmed';
    driverSettlementMethod?: 'cash' | 'balance' | 'none';
    driverPaymentSubmittedAt?: string;
    adminConfirmedAt?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DriverSettlementTrip {
    tripId: string | Trip;
    allocatedAmount: number;
}

export interface DriverSettlement {
    _id?: string;
    settlementNumber?: string;
    driverId: any;
    tenantId: any;
    amount: number;
    paymentMethod: 'gpay' | 'cash' | 'phonepe' | 'bank_transfer' | 'other';
    paymentDate: string;
    referenceId?: string;
    receiptUrl?: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected';
    trips: DriverSettlementTrip[];
    adminNotes?: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

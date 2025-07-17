
import type { Customer, Invoice, RevenueData, Payment } from './types';

// This file is now deprecated for storing dynamic data.
// Data is now fetched from and written to Firestore.
// These arrays can be used for initial seeding or testing if needed.

export const customers: Customer[] = [];

export const invoices: Invoice[] = [];

export const payments: Payment[] = [];

// Static data can remain here.
export const revenueData: RevenueData[] = [
    { month: 'Jan', revenue: 60000000 },
    { month: 'Feb', revenue: 45000000 },
    { month: 'Mar', revenue: 75000000 },
    { month: 'Apr', revenue: 67500000 },
    { month: 'Mei', revenue: 90000000 },
    { month: 'Jun', revenue: 82500000 },
];

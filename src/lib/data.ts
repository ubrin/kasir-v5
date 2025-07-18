
import type { Customer, Invoice, RevenueData, Payment } from './types';
import { format, subMonths, addMonths } from 'date-fns';

// This file is now deprecated for storing dynamic data.
// Data is now fetched from and written to Firestore.
// These arrays can be used for initial seeding or testing if needed.

const today = new Date();

export const customers: Customer[] = [
  {
    id: 'CUST001',
    name: 'Budi Santoso',
    phone: '6281234567890',
    address: 'Jl. Merdeka No. 123',
    dueDateCode: 10,
    installationDate: format(subMonths(today, 3), 'yyyy-MM-dd'),
    subscriptionMbps: 50,
    packagePrice: 300000,
    outstandingBalance: 300000,
    paymentHistory: 'Pelanggan setia sejak 3 bulan lalu.'
  },
  {
    id: 'CUST002',
    name: 'Citra Lestari',
    phone: '6285711223344',
    address: 'Jl. Pahlawan No. 45',
    dueDateCode: 20,
    installationDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
    subscriptionMbps: 30,
    packagePrice: 250000,
    outstandingBalance: 0,
    paymentHistory: 'Baru berlangganan bulan lalu.'
  },
  {
    id: 'CUST003',
    name: 'Agus Wijaya',
    phone: '6287899887766',
    address: 'Perumahan Indah Blok C1',
    dueDateCode: 10,
    installationDate: format(subMonths(today, 6), 'yyyy-MM-dd'),
    subscriptionMbps: 100,
    packagePrice: 500000,
    outstandingBalance: 500000,
    paymentHistory: 'Upgrade paket ke 100 Mbps bulan ini.'
  },
   {
    id: 'CUST004',
    name: 'Dewi Anggraini',
    phone: '6281122334455',
    address: 'Jl. Kenanga No. 8',
    dueDateCode: 25,
    installationDate: format(subMonths(today, 12), 'yyyy-MM-dd'),
    subscriptionMbps: 20,
    packagePrice: 180000,
    outstandingBalance: 360000,
    paymentHistory: 'Menunggak 2 bulan.'
  }
];

export const invoices: Invoice[] = [
  // Invoices for Budi Santoso
  {
    id: 'INV001',
    customerId: 'CUST001',
    customerName: 'Budi Santoso',
    date: format(today, 'yyyy-MM-dd'),
    dueDate: format(new Date(today.getFullYear(), today.getMonth(), 10), 'yyyy-MM-dd'),
    amount: 300000,
    status: 'belum lunas'
  },
  // Invoices for Citra Lestari
   {
    id: 'INV002',
    customerId: 'CUST002',
    customerName: 'Citra Lestari',
    date: format(subMonths(today, 1), 'yyyy-MM-dd'),
    dueDate: format(new Date(today.getFullYear(), today.getMonth() -1, 20), 'yyyy-MM-dd'),
    amount: 250000,
    status: 'lunas'
  },
   // Invoices for Agus Wijaya
  {
    id: 'INV003',
    customerId: 'CUST003',
    customerName: 'Agus Wijaya',
    date: format(today, 'yyyy-MM-dd'),
    dueDate: format(new Date(today.getFullYear(), today.getMonth(), 10), 'yyyy-MM-dd'),
    amount: 500000,
    status: 'belum lunas'
  },
    // Invoices for Dewi Anggraini
  {
    id: 'INV004',
    customerId: 'CUST004',
    customerName: 'Dewi Anggraini',
    date: format(today, 'yyyy-MM-dd'),
    dueDate: format(new Date(today.getFullYear(), today.getMonth(), 25), 'yyyy-MM-dd'),
    amount: 180000,
    status: 'belum lunas'
  },
  {
    id: 'INV005',
    customerId: 'CUST004',
    customerName: 'Dewi Anggraini',
    date: format(subMonths(today, 1), 'yyyy-MM-dd'),
    dueDate: format(new Date(today.getFullYear(), today.getMonth() - 1, 25), 'yyyy-MM-dd'),
    amount: 180000,
    status: 'belum lunas'
  }
];

export const payments: Payment[] = [
    {
        id: 'PAY001',
        customerId: 'CUST002',
        customerName: 'Citra Lestari',
        paymentDate: format(subMonths(today, 1), 'yyyy-MM-dd'),
        paidAmount: 250000,
        paymentMethod: 'dana',
        invoiceIds: ['INV002'],
        totalBill: 250000,
        discount: 0,
        totalPayment: 250000,
        changeAmount: 0
    }
];


// Static data can remain here.
export const revenueData: RevenueData[] = [
    { month: 'Jan', revenue: 60000000 },
    { month: 'Feb', revenue: 45000000 },
    { month: 'Mar', revenue: 75000000 },
    { month: 'Apr', revenue: 67500000 },
    { month: 'Mei', revenue: 90000000 },
    { month: 'Jun', revenue: 82500000 },
];

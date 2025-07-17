import type { Customer, Invoice, RevenueData } from './types';

export const customers: Customer[] = [
  {
    id: 'cus_1',
    name: 'Budi Santoso',
    dueDateCode: 5,
    address: 'Jl. Merdeka No. 1, Jakarta',
    status: 'belum lunas',
    amountDue: 22500000,
    paymentHistory: 'Membayar tepat waktu selama 12 bulan terakhir.',
    accountAgeMonths: 24,
    outstandingBalance: 22500000,
  },
  {
    id: 'cus_2',
    name: 'Citra Lestari',
    dueDateCode: 10,
    address: 'Jl. Sudirman Kav. 5, Bandung',
    status: 'belum lunas',
    amountDue: 3750000,
    paymentHistory: 'Satu pembayaran terlambat 3 bulan yang lalu. Selebihnya bayar tepat waktu.',
    accountAgeMonths: 18,
    outstandingBalance: 3750000,
  },
  {
    id: 'cus_3',
    name: 'Adi Nugroho',
    dueDateCode: 15,
    address: 'Jl. Gajah Mada No. 10, Surabaya',
    status: 'lunas',
    amountDue: 0,
    paymentHistory: 'Akun ditutup. Semua pembayaran sudah dilunasi.',
    accountAgeMonths: 36,
    outstandingBalance: 0,
  },
  {
    id: 'cus_4',
    name: 'Dewi Anggraini',
    dueDateCode: 20,
    address: 'Jl. Thamrin No. 8, Medan',
    status: 'belum lunas',
    amountDue: 78000000,
    paymentHistory: 'Sering terlambat membayar selama 6 bulan terakhir. Beberapa pengingat telah dikirim.',
    accountAgeMonths: 15,
    outstandingBalance: 78000000,
  },
  {
    id: 'cus_5',
    name: 'Eko Prasetyo',
    dueDateCode: 25,
    address: 'Jl. Pahlawan No. 2, Semarang',
    status: 'lunas',
    amountDue: 0,
    paymentHistory: 'Pelanggan baru, tagihan pertama belum jatuh tempo.',
    accountAgeMonths: 1,
    outstandingBalance: 0,
  },
];

export const invoices: Invoice[] = [
    { id: 'INV-001', customerId: 'cus_1', customerName: 'Budi Santoso', date: '2024-06-01', dueDate: '2024-07-01', amount: 22500000, status: 'belum lunas' },
    { id: 'INV-002', customerId: 'cus_2', customerName: 'Citra Lestari', date: '2024-06-05', dueDate: '2024-07-05', amount: 3750000, status: 'belum lunas' },
    { id: 'INV-003', customerId: 'cus_4', customerName: 'Dewi Anggraini', date: '2024-05-15', dueDate: '2024-06-15', amount: 39000000, status: 'belum lunas' },
    { id: 'INV-004', customerId: 'cus_4', customerName: 'Dewi Anggraini', date: '2024-06-15', dueDate: '2024-07-15', amount: 39000000, status: 'belum lunas' },
    { id: 'INV-005', customerId: 'cus_1', customerName: 'Budi Santoso', date: '2024-05-01', dueDate: '2024-06-01', amount: 22500000, status: 'lunas' },
    { id: 'INV-006', customerId: 'cus_2', customerName: 'Citra Lestari', date: '2024-05-05', dueDate: '2024-06-05', amount: 3750000, status: 'lunas' },
];

export const revenueData: RevenueData[] = [
    { month: 'Jan', revenue: 60000000 },
    { month: 'Feb', revenue: 45000000 },
    { month: 'Mar', revenue: 75000000 },
    { month: 'Apr', revenue: 67500000 },
    { month: 'Mei', revenue: 90000000 },
    { month: 'Jun', revenue: 82500000 },
];

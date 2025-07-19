

export type Customer = {
  id: string; // Corresponds to Firestore document ID
  name: string;
  phone?: string;
  dueDateCode: number;
  address: string;
  // Status will be derived from outstandingBalance now
  // status: 'lunas' | 'belum lunas';
  // amountDue will be replaced by outstandingBalance
  // amountDue: number;
  paymentHistory?: string; // Optional notes
  installationDate: string; // Stored as 'yyyy-MM-dd'
  outstandingBalance: number;
  subscriptionMbps: number;
  packagePrice: number;
  creditBalance?: number; // Saldo atau deposit pelanggan
};

export type Invoice = {
  id: string; // Corresponds to Firestore document ID
  customerId: string;
  customerName: string;
  date: string; // 'yyyy-MM-dd'
  dueDate: string; // 'yyyy-MM-dd'
  amount: number;
  status: 'lunas' | 'belum lunas';
};

export type RevenueData = {
  month: string;
  revenue: number;
};

export type Payment = {
  id: string; // Corresponds to Firestore document ID
  customerId: string;
  customerName: string;
  paymentDate: string; // 'yyyy-MM-dd'
  paidAmount: number;
  paymentMethod: 'cash' | 'bri' | 'dana';
  invoiceIds: string[];
  totalBill: number;
  discount: number;
  totalPayment: number;
  changeAmount: number;
};

export type AppUser = {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
};

export type Expense = {
  id: string;
  name: string;
  amount: number;
  category: 'utama' | 'angsuran' | 'lainnya';
  date?: string; // 'yyyy-MM-dd'
  dueDateDay?: number; // 1-31
  tenor?: number;
  paidTenor?: number;
  note?: string;
};

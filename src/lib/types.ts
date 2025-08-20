

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
  paymentDate: string; // 'yyyy-MM-dd HH:mm:ss'
  paidAmount: number;
  paymentMethod: 'cash' | 'bri' | 'dana';
  invoiceIds: string[];
  totalBill: number;
  discount: number;
  totalPayment: number;
  changeAmount: number;
  collectorId?: string;
  collectorName?: string;
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
  amount?: number; // Made optional for 'utama' category templates
  category: 'utama' | 'angsuran' | 'lainnya';
  date?: string; // 'yyyy-MM-dd', only for transaction records, not for templates
  
  // Fields for recurring expenses ('utama' or 'angsuran')
  dueDateDay?: number; // Day of the month for due date
  
  // Fields for installment ('angsuran')
  tenor?: number; // Total months/installments
  paidTenor?: number; // How many installments have been paid
  lastPaidDate?: string; // 'yyyy-MM-dd'
  paymentHistory?: string[]; // Array of payment dates
};

export type Collector = {
    id: string;
    name: string;
}

export type OtherIncome = {
  id: string;
  name: string;
  amount: number;
  date: string; // 'yyyy-MM-dd'
};

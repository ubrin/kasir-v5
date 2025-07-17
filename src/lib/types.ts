export type Customer = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  company: string;
  status: 'active' | 'inactive';
  amountDue: number;
  paymentHistory: string;
  accountAgeMonths: number;
  averageMonthlyBill: number;
  outstandingBalance: number;
};

export type Invoice = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
};

export type RevenueData = {
  month: string;
  revenue: number;
};

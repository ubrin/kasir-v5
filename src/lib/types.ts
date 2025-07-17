export type Customer = {
  id: string;
  name: string;
  dueDateCode: number;
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
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
};

export type RevenueData = {
  month: string;
  revenue: number;
};

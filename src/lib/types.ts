export type Customer = {
  id: string;
  name: string;
  dueDateCode: number;
  avatar: string;
  address: string;
  status: 'lunas' | 'belum lunas';
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
  status: 'lunas' | 'belum lunas';
};

export type RevenueData = {
  month: string;
  revenue: number;
};

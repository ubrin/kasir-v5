export type Customer = {
  id: string;
  name: string;
  dueDateCode: number;
  address: string;
  status: 'lunas' | 'belum lunas';
  amountDue: number;
  paymentHistory: string;
  installationDate: string;
  outstandingBalance: number;
  subscriptionMbps: number;
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

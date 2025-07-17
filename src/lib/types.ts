export type Customer = {
  id: string;
  name: string;
  phone?: string; // Tambahkan nomor telepon
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

export type Payment = {
  id: string;
  customerId: string;
  customerName: string;
  paymentDate: string;
  paidAmount: number;
  paymentMethod: 'cash' | 'bri' | 'dana';
  invoiceIds: string[];
  totalBill: number;
  discount: number;
  totalPayment: number;
  changeAmount: number;
};
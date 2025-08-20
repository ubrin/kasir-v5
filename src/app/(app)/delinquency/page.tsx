
'use client';

import * as React from "react";
import { collection, query, where, getDocs, writeBatch, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import type { Customer, Invoice, Payment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payment-dialog";
import { format, parseISO, startOfMonth } from 'date-fns';

type DelinquentCustomer = Customer & {
  overdueAmount: number;
  invoices: Invoice[];
};

export default function DelinquencyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [delinquentCustomers, setDelinquentCustomers] = React.useState<DelinquentCustomer[]>([]);

  const fetchDelinquentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const customersCollection = collection(db, "customers");
      const invoicesUnpaidQuery = query(collection(db, "invoices"), where("status", "==", "belum lunas"));

      const [customersSnapshot, unpaidInvoicesSnapshot] = await Promise.all([
        getDocs(customersCollection),
        getDocs(invoicesUnpaidQuery),
      ]);

      const allCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const customerMap = new Map(allCustomers.map(c => [c.id, c]));
      
      const unpaidInvoices = unpaidInvoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));

      const delinquentCustomersMap = new Map<string, DelinquentCustomer>();

      for (const invoice of unpaidInvoices) {
        const customer = customerMap.get(invoice.customerId);
        if (!customer) continue;

        if (!delinquentCustomersMap.has(customer.id)) {
          delinquentCustomersMap.set(customer.id, {
            ...customer,
            overdueAmount: 0,
            invoices: [],
          });
        }

        const delinquentCustomer = delinquentCustomersMap.get(customer.id)!;
        delinquentCustomer.invoices.push(invoice);
        delinquentCustomer.overdueAmount += invoice.amount;
      }
      
      const delinquentCustomersList = Array.from(delinquentCustomersMap.values())
        .sort((a,b) => a.address.localeCompare(b.address));

      setDelinquentCustomers(delinquentCustomersList);

    } catch (error) {
      console.error("Error fetching delinquency data:", error);
      toast({
        title: "Gagal memuat data tunggakan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDelinquentData();
  }, [fetchDelinquentData]);

  const handlePaymentSuccess = () => {
    toast({
      title: 'Pembayaran Berhasil',
      description: 'Data pembayaran telah berhasil disimpan.',
    });
    fetchDelinquentData(); // Refresh data after payment
  };

  const calculateArrears = (invoices: Invoice[]) => {
    const startOfCurrent = startOfMonth(new Date());
    return invoices
      .filter(inv => parseISO(inv.date) < startOfCurrent)
      .reduce((sum, inv) => sum + inv.amount, 0);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tagihan Belum Lunas</h1>
          <p className="text-muted-foreground">Daftar pelanggan dengan faktur yang belum dibayar.</p>
        </div>
      </div>
      
      {delinquentCustomers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pelanggan Menunggak</CardTitle>
            <CardDescription>Berikut adalah daftar pelanggan dengan tagihan yang belum dibayar, diurutkan berdasarkan alamat.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Total Tunggakan</TableHead>
                  <TableHead className="text-right">Tunggakan Lalu</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquentCustomers.map((customer) => {
                  const arrears = calculateArrears(customer.invoices);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell className="text-right font-semibold">Rp{customer.overdueAmount.toLocaleString('id-ID')}</TableCell>
                      <TableCell className={`text-right font-semibold ${arrears > 0 ? 'text-destructive' : ''}`}>
                        Rp{arrears.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <PaymentDialog customer={customer} onPaymentSuccess={handlePaymentSuccess} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
         <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                <Wallet className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Semua Tagihan Lunas</h2>
                <p className="text-muted-foreground max-w-md">
                    Tidak ada pelanggan dengan tagihan yang belum dibayar saat ini. Kerja bagus!
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

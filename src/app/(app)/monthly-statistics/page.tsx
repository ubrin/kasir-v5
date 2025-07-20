
'use client'
import * as React from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Payment, Expense } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, TrendingDown, Users, TrendingUp, Loader2 } from "lucide-react"
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns"
import { id } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MonthlyStatisticsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [stats, setStats] = React.useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        newCustomers: 0,
    });
    const [monthlyData, setMonthlyData] = React.useState<{payments: Payment[], expenses: Expense[]}>({
        payments: [],
        expenses: []
    });

    const currentMonthName = format(new Date(), "MMMM yyyy", { locale: id });

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const today = new Date();
                const start = startOfMonth(today);
                const end = endOfMonth(today);

                const paymentsQuery = query(collection(db, "payments"), 
                    where("paymentDate", ">=", format(start, 'yyyy-MM-dd')),
                    where("paymentDate", "<=", format(end, 'yyyy-MM-dd'))
                );

                const expensesQuery = query(collection(db, "expenses"), 
                    where("date", ">=", format(start, 'yyyy-MM-dd')),
                    where("date", "<=", format(end, 'yyyy-MM-dd'))
                );

                const customersQuery = query(collection(db, "customers"), 
                    where("installationDate", ">=", format(start, 'yyyy-MM-dd')),
                    where("installationDate", "<=", format(end, 'yyyy-MM-dd'))
                );

                const [paymentsSnapshot, expensesSnapshot, customersSnapshot] = await Promise.all([
                    getDocs(paymentsQuery),
                    getDocs(expensesQuery),
                    getDocs(customersSnapshot),
                ]);

                const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
                const expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
                
                const totalRevenue = paymentsList.reduce((acc, p) => acc + (p.totalPayment || p.paidAmount), 0);
                const totalExpenses = expensesList.reduce((acc, e) => acc + e.amount, 0);
                const netProfit = totalRevenue - totalExpenses;
                const newCustomers = customersSnapshot.size;

                setStats({
                    totalRevenue,
                    totalExpenses,
                    netProfit,
                    newCustomers,
                });

                setMonthlyData({
                    payments: paymentsList.sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime()),
                    expenses: expensesList.sort((a,b) => parseISO(b.date!).getTime() - parseISO(a.date!).getTime())
                });

            } catch (error) {
                console.error("Failed to fetch monthly statistics:", error);
                toast({
                    title: "Gagal memuat statistik",
                    description: "Tidak dapat mengambil data untuk bulan ini.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
        switch(method) {
            case 'cash': return <Badge variant="secondary">Cash</Badge>;
            case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
            case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
        }
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
            <h1 className="text-3xl font-bold tracking-tight">Statistik Bulanan</h1>
            <p className="text-muted-foreground">Ringkasan keuangan untuk bulan {currentMonthName}.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pemasukan
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp{stats.totalRevenue.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Pemasukan bulan ini
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pengeluaran
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">Rp{stats.totalExpenses.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Pengeluaran bulan ini
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Keuntungan Bersih
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                Rp{stats.netProfit.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Pemasukan dikurangi pengeluaran
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pelanggan Baru
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.newCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Pelanggan baru bulan ini
              </p>
            </CardContent>
          </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rincian Pemasukan</CardTitle>
            <CardDescription>Daftar semua pembayaran yang diterima bulan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.payments.length > 0 ? monthlyData.payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(parseISO(payment.paymentDate), 'd MMM', { locale: id })}</TableCell>
                    <TableCell>{payment.customerName}</TableCell>
                    <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                    <TableCell className="text-right font-medium">Rp{payment.totalPayment.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">Belum ada pemasukan bulan ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rincian Pengeluaran</CardTitle>
            <CardDescription>Daftar semua pengeluaran yang tercatat bulan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.expenses.length > 0 ? monthlyData.expenses.map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.date ? format(parseISO(expense.date), 'd MMM', { locale: id }) : '-'}</TableCell>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium">Rp{expense.amount.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">Belum ada pengeluaran bulan ini.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

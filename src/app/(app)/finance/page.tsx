
'use client'
import * as React from "react";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice, Payment, Expense, OtherIncome } from "@/lib/types";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Wallet, AreaChart, DollarSign, Archive, FileText, FileClock, Users, Coins, BookText } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { parseISO, startOfMonth, subMonths, getMonth, getYear, isSameMonth, isSameYear, format, differenceInMonths } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area";


const pieChartColors = ["hsl(142.1 76.2% 36.3%)", "hsl(0 84.2% 60.2%)"];

type ArrearsDetail = {
    name: string;
    amount: number;
    id: string;
}

export default function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
      totalIncome: 0,
      totalExpense: 0,
      totalOtherIncome: 0,
      balance: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      netProfit: 0,
      totalOmset: 0,
      totalArrears: 0,
      newCustomersCount: 0,
  });
  const [monthlyRevenueData, setMonthlyRevenueData] = React.useState<any[]>([]);
  const [pieData, setPieData] = React.useState<any[]>([]);
  const [newCustomers, setNewCustomers] = React.useState<Customer[]>([]);
  const [arrearsDetails, setArrearsDetails] = React.useState<ArrearsDetail[]>([]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
        const [
            paymentsSnapshot, 
            expensesSnapshot, 
            otherIncomesSnapshot,
            customersSnapshot,
            invoicesSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, "payments")),
            getDocs(query(collection(db, "expenses"), where("date", "!=", null))),
            getDocs(collection(db, "otherIncomes")),
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "invoices")),
        ]);
        
        const payments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
        const expenses = expensesSnapshot.docs.map(doc => doc.data() as Expense);
        const otherIncomes = otherIncomesSnapshot.docs.map(doc => doc.data() as OtherIncome);
        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));

        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);

        // Pelanggan Baru
        const newCustomersList = customers.filter(c => c.installationDate && isSameMonth(parseISO(c.installationDate), today) && isSameYear(parseISO(c.installationDate), today));
        setNewCustomers(newCustomersList);

        // Tunggakan
        const oldUnpaidInvoices = invoices.filter(invoice => {
            const invoiceDate = parseISO(invoice.date);
            return invoice.status === 'belum lunas' && invoiceDate < startOfCurrentMonth;
        });

        const arrearsByCustomer: { [id: string]: ArrearsDetail } = {};
        oldUnpaidInvoices.forEach(invoice => {
            if (!arrearsByCustomer[invoice.customerId]) {
                arrearsByCustomer[invoice.customerId] = {
                    id: invoice.customerId,
                    name: invoice.customerName,
                    amount: 0,
                };
            }
            arrearsByCustomer[invoice.customerId].amount += invoice.amount;
        });
        const arrearsList = Object.values(arrearsByCustomer).sort((a,b) => b.amount - a.amount);
        setArrearsDetails(arrearsList);
        const totalArrears = arrearsList.reduce((acc, detail) => acc + detail.amount, 0);

        // Total Accumulation Calculations
        const totalIncome = payments.reduce((sum, p) => sum + (p.totalPayment || p.paidAmount), 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalOtherIncome = otherIncomes.reduce((sum, e) => sum + e.amount, 0);
        const balance = (totalIncome + totalOtherIncome) - totalExpense;

        // Monthly Specific Calculations
        const thisMonthPayments = payments.filter(p => {
            const paymentDate = parseISO(p.paymentDate);
            return isSameMonth(paymentDate, today) && isSameYear(paymentDate, today);
        });
        const monthlyIncome = thisMonthPayments.reduce((sum, p) => sum + (p.totalPayment || p.paidAmount), 0);

        const thisMonthExpenses = expenses.filter(e => {
            const expenseDate = parseISO(e.date!);
            return isSameMonth(expenseDate, today) && isSameYear(expenseDate, today);
        });
        const monthlyExpense = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = monthlyIncome - monthlyExpense;

        // General stats for cards
        const totalOmset = customers.reduce((acc, c) => acc + c.packagePrice, 0);
        
        // Chart Data
        const thisMonthInvoices = invoices.filter(invoice => {
            const invoiceDate = parseISO(invoice.date);
            return isSameMonth(invoiceDate, today) && isSameYear(invoiceDate, today);
        });
        const paidInvoicesStats = thisMonthInvoices.filter(i => i.status === 'lunas').reduce((acc, inv) => ({ count: acc.count + 1, amount: acc.amount + inv.amount }), { count: 0, amount: 0 });
        const unpaidInvoicesStats = thisMonthInvoices.filter(i => i.status === 'belum lunas').reduce((acc, inv) => ({ count: acc.count + 1, amount: acc.amount + inv.amount }), { count: 0, amount: 0 });
        setPieData([
            { name: 'Lunas', value: paidInvoicesStats.amount, count: paidInvoicesStats.count },
            { name: 'Belum Lunas', value: unpaidInvoicesStats.amount, count: unpaidInvoicesStats.count },
        ]);

        const revenueDataByMonth: { [key: string]: number } = {};
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthName = date.toLocaleString('id-ID', { month: 'short' });
            revenueDataByMonth[monthName] = 0;
        }
        payments.forEach(p => {
            const paymentDate = parseISO(p.paymentDate);
            if (differenceInMonths(new Date(), paymentDate) < 6) {
                const monthName = paymentDate.toLocaleString('id-ID', { month: 'short' });
                if (revenueDataByMonth.hasOwnProperty(monthName)) {
                    revenueDataByMonth[monthName] += (p.totalPayment || p.paidAmount);
                }
            }
        });
        setMonthlyRevenueData(Object.keys(revenueDataByMonth).map(month => ({ month, revenue: revenueDataByMonth[month] })));


        setStats({
            totalIncome,
            totalExpense,
            totalOtherIncome,
            balance,
            monthlyIncome,
            monthlyExpense,
            netProfit,
            totalOmset,
            totalArrears,
            newCustomersCount: newCustomersList.length,
        });

    } catch (error) {
        console.error("Failed to fetch finance data:", error);
        toast({
            title: "Gagal memuat data",
            description: "Tidak dapat mengambil data keuangan.",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Keuangan & Statistik</h1>
            <p className="text-muted-foreground">Analisis keuangan bulanan dan total.</p>
        </div>
      </div>

        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Keuangan Bulan Ini</CardTitle>
                <CardDescription>Pemasukan, pengeluaran, dan laba bersih yang tercatat bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 sm:grid-cols-3">
                    <div className="flex items-center gap-4">
                         <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pemasukan</p>
                            <p className="text-2xl font-bold">Rp{stats.monthlyIncome.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pengeluaran</p>
                            <p className="text-2xl font-bold">Rp{stats.monthlyExpense.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                            <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Laba Bersih</p>
                            <p className="text-2xl font-bold">Rp{stats.netProfit.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Omset Potensial</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">Rp{stats.totalOmset.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Potensi pendapatan bulanan</p>
                </CardContent>
            </Card>

            <Dialog>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pelanggan Baru Bulan Ini</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">+{stats.newCustomersCount}</div>
                        <p className="text-xs text-muted-foreground">Pelanggan baru bulan ini</p>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                 <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Pelanggan Baru Bulan Ini</DialogTitle>
                    <DialogDescription>
                        Berikut adalah daftar pelanggan yang bergabung pada bulan {format(new Date(), 'MMMM yyyy', {locale: id})}.
                    </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-60">
                        {newCustomers.length > 0 ? (
                            <ul className="space-y-2 p-1">
                                {newCustomers.map(customer => (
                                    <li key={customer.id} className="text-sm p-2 rounded-md bg-muted/50">{customer.name}</li>
                                ))}
                            </ul>
                        ): (
                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada pelanggan baru bulan ini.</p>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog>
                 <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tunggakan</CardTitle>
                        <FileClock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">Rp{stats.totalArrears.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground">Tagihan belum lunas dari bulan lalu</p>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rincian Tunggakan</DialogTitle>
                        <DialogDescription>
                            Daftar pelanggan yang memiliki tunggakan dari bulan-bulan sebelumnya.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-80">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead className="text-right">Jumlah Tunggakan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {arrearsDetails.length > 0 ? arrearsDetails.map(detail => (
                                <TableRow key={detail.id}>
                                    <TableCell className="font-medium">{detail.name}</TableCell>
                                    <TableCell className="text-right">Rp{detail.amount.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                                )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">Tidak ada tunggakan.</TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ringkasan Pendapatan</CardTitle>
            <CardDescription>Grafik pendapatan yang diterima selama 6 bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyRevenueData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value as number)}`}/>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(value: number) => [`Rp${value.toLocaleString('id-ID')}`, 'Pendapatan']}/>
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
        <CardHeader>
            <CardTitle>Status Faktur Bulan Ini</CardTitle>
            <CardDescription>Visualisasi faktur yang sudah dan belum dibayar bulan ini.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center pb-0">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(value: number, name: string, props: any) => [`Rp${value.toLocaleString('id-ID')}`, `${name} (${props.payload.count} Faktur)`]}/>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (!percent || percent < 0.01) return null;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>{`${(percent * 100).toFixed(0)}%`}</text>);
                    }}>
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
                </ResponsiveContainer>
        </CardContent>
        </Card>
      </div>
       <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
                <Link href="/other-incomes">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Pemasukan Lainnya
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/expenses">
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Lihat Pengeluaran
                </Link>
            </Button>
        </div>
    </div>
  )
}

    
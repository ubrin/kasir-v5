
'use client'
import * as React from "react";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice, Payment, Expense } from "@/lib/types";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { DollarSign, Users, CreditCard, Activity, Archive, Loader2, FileClock, Files, TrendingUp, TrendingDown, Wallet, AreaChart, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { differenceInMonths, parseISO, startOfMonth, subMonths, getMonth, getYear, isSameMonth, isSameYear, format, differenceInCalendarMonths, addMonths } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const pieChartColors = ["hsl(142.1 76.2% 36.3%)", "hsl(0 84.2% 60.2%)"];

export default function MonthlyStatisticsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [generatingInvoices, setGeneratingInvoices] = React.useState(false);
    const [stats, setStats] = React.useState({
        totalOmset: 0,
        totalArrears: 0,
        newCustomers: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        netProfit: 0,
    });
    const [monthlyRevenueData, setMonthlyRevenueData] = React.useState<any[]>([]);
    const [pieData, setPieData] = React.useState<any[]>([]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [customersSnapshot, invoicesSnapshot, paymentsSnapshot, expensesSnapshot] = await Promise.all([
                getDocs(collection(db, "customers")),
                getDocs(collection(db, "invoices")),
                getDocs(collection(db, "payments")),
                getDocs(query(collection(db, "expenses"), where("date", "!=", null)))
            ]);

            const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            
            const today = new Date();
            const currentMonth = getMonth(today);
            const currentYear = getYear(today);
            const startOfCurrentMonth = startOfMonth(today);

            // Monthly specific calculations
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


            // General stats
            const totalOmset = customers.reduce((acc, c) => acc + c.packagePrice, 0);
            const newCustomers = customers.filter(c => c.installationDate && isSameMonth(parseISO(c.installationDate), today) && isSameYear(parseISO(c.installationDate), today)).length;
            
            const oldUnpaidInvoices = invoices.filter(invoice => {
                const invoiceDate = parseISO(invoice.date);
                return invoice.status === 'belum lunas' && invoiceDate < startOfCurrentMonth;
            });
            const totalArrears = oldUnpaidInvoices.reduce((acc, inv) => acc + inv.amount, 0);

            setStats({
                totalOmset,
                totalArrears,
                newCustomers,
                monthlyIncome,
                monthlyExpense,
                netProfit,
            });
            
            // Chart Data
            const thisMonthInvoices = invoices.filter(invoice => {
                const invoiceDate = parseISO(invoice.date);
                return getMonth(invoiceDate) === currentMonth && getYear(invoiceDate) === currentYear;
            });

            const paidInvoicesStats = thisMonthInvoices
                .filter(i => i.status === 'lunas')
                .reduce((acc, inv) => {
                    acc.count++;
                    acc.amount += inv.amount;
                    return acc;
                }, { count: 0, amount: 0 });

            const unpaidInvoicesStats = thisMonthInvoices
                .filter(i => i.status === 'belum lunas')
                .reduce((acc, inv) => {
                    acc.count++;
                    acc.amount += inv.amount;
                    return acc;
                }, { count: 0, amount: 0 });
            
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
                        revenueDataByMonth[monthName] += (p.totalPayment || p.paidAmount); // Fallback for older data
                    }
                }
            });
            setMonthlyRevenueData(Object.keys(revenueDataByMonth).map(month => ({ month, revenue: revenueDataByMonth[month] })));

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            toast({
                title: "Gagal memuat data",
                description: "Tidak dapat mengambil data untuk dasbor.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleArchivePaidInvoices = async () => {
        try {
            const q = query(collection(db, "invoices"), where("status", "==", "lunas"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast({
                    title: "Tidak Ada Data untuk Diarsipkan",
                    description: "Semua faktur lunas sudah diarsipkan.",
                    variant: "default",
                });
                return;
            }

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({
                title: "Pengarsipan Berhasil",
                description: `${snapshot.size} faktur yang sudah lunas telah diarsipkan.`,
            });

            fetchData();
        } catch (error) {
            console.error("Archiving error:", error);
            toast({
                title: "Gagal Mengarsipkan",
                description: "Terjadi kesalahan saat mengarsipkan faktur.",
                variant: "destructive",
            });
        }
    };

    const handleGenerateMonthlyInvoices = async () => {
        setGeneratingInvoices(true);
        try {
            const customersSnapshot = await getDocs(collection(db, "customers"));
            if (customersSnapshot.empty) {
                toast({ title: "Tidak ada pelanggan", description: "Tidak ada pelanggan yang ditemukan untuk dibuatkan faktur." });
                return;
            }

            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const monthStr = String(month + 1).padStart(2, '0');
            const yearStr = String(year);
            const currentInvoiceMonth = `${yearStr}-${monthStr}-01`;

            const batch = writeBatch(db);
            let invoicesCreatedCount = 0;

            const invoiceQuery = query(collection(db, "invoices"), where("date", ">=", currentInvoiceMonth));
            const existingInvoicesSnapshot = await getDocs(invoiceQuery);
            const existingInvoices = existingInvoicesSnapshot.docs.map(doc => ({ ...doc.data() as Invoice, id: doc.id }));
            
            for (const docSnap of customersSnapshot.docs) {
                const customer = { id: docSnap.id, ...docSnap.data() } as Customer;

                const alreadyExists = existingInvoices.some(inv => inv.customerId === customer.id && inv.date === currentInvoiceMonth);

                if (!alreadyExists && customer.packagePrice > 0) {
                    const dueDate = new Date(year, month, customer.dueDateCode);
                    const newInvoice: Omit<Invoice, 'id'> = {
                        customerId: customer.id,
                        customerName: customer.name,
                        date: currentInvoiceMonth,
                        dueDate: format(dueDate, 'yyyy-MM-dd'),
                        amount: customer.packagePrice,
                        status: 'belum lunas',
                    };

                    const newInvoiceRef = doc(collection(db, "invoices"));
                    batch.set(newInvoiceRef, newInvoice);
                    invoicesCreatedCount++;
                }
            }

            if (invoicesCreatedCount > 0) {
                await batch.commit();
                toast({ title: "Penerbitan Berhasil", description: `Berhasil membuat ${invoicesCreatedCount} faktur baru untuk bulan ini.` });
                fetchData(); // Refresh data on page
            } else {
                toast({ title: "Tidak Ada Faktur Baru", description: "Semua faktur untuk bulan ini sudah diterbitkan." });
            }

        } catch (error) {
            console.error("Manual invoice generation error:", error);
            toast({ title: "Gagal Menerbitkan Faktur", variant: "destructive" });
        } finally {
            setGeneratingInvoices(false);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Statistik Bulanan</h1>
        <div className="flex gap-2">
            <Button onClick={handleGenerateMonthlyInvoices} disabled={generatingInvoices}>
                {generatingInvoices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {generatingInvoices ? "Menerbitkan..." : "Terbitkan Faktur Bulan Ini"}
            </Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">
                    <Archive className="mr-2 h-4 w-4" />
                    Arsipkan Faktur Lunas
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin mengarsipkan?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus semua data faktur dengan status "Lunas" dari daftar aktif. Tindakan ini tidak dapat dibatalkan. Data pelanggan dan faktur yang menunggak tidak akan terpengaruh.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchivePaidInvoices} className="bg-destructive hover:bg-destructive/90">
                    Ya, Arsipkan Sekarang
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
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
        <Link href="/customers">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Omset
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp{stats.totalOmset.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">
                Potensi pendapatan bulanan
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customers">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pelanggan Baru
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.newCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Bulan ini
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/delinquency">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Tunggakan
                </CardTitle>
                <FileClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Rp{stats.totalArrears.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">
                Tagihan belum lunas dari bulan lalu
                </p>
            </CardContent>
            </Card>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ringkasan Pendapatan</CardTitle>
            <CardDescription>Grafik pendapatan yang diterima selama beberapa bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyRevenueData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    />
                    <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rp${new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value as number)}`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                        }}
                        formatter={(value: number) => [`Rp${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
        <CardHeader>
            <CardTitle>Status Pembayaran Faktur (Bulan Ini)</CardTitle>
            <CardDescription>Visualisasi faktur yang sudah dan belum dibayar bulan ini.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center pb-0">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                        }}
                        formatter={(value: number, name: string, props: any) => [
                        `Rp${value.toLocaleString('id-ID')}`, 
                        `${name} (${props.payload.count} Faktur)`
                        ]}
                    />
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        if (!percent || percent < 0.01) return null;
                        return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                            {`${(percent * 100).toFixed(0)}%`}
                        </text>
                        );
                    }}
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                    ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
                </ResponsiveContainer>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}


'use client'
import * as React from "react";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice, Payment } from "@/lib/types";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { DollarSign, Users, CreditCard, Activity, Archive, Loader2, FileClock, Files } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { differenceInMonths, parseISO, startOfMonth, endOfMonth, subMonths, getMonth, getYear } from "date-fns"
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

const pieChartColors = ["hsl(142.1 76.2% 36.3%)", "hsl(0 84.2% 60.2%)"];

export default function DashboardPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [stats, setStats] = React.useState({
        totalOmset: 0,
        totalArrears: 0,
        newCustomers: 0,
        thisMonthTotalBill: 0,
        thisMonthInvoiceCount: 0,
    });
    const [monthlyRevenueData, setMonthlyRevenueData] = React.useState<any[]>([]);
    const [pieData, setPieData] = React.useState<any[]>([]);
    const [paymentSummary, setPaymentSummary] = React.useState({ cash: 0, bri: 0, dana: 0, total: 0 });

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [customersSnapshot, invoicesSnapshot, paymentsSnapshot] = await Promise.all([
                getDocs(collection(db, "customers")),
                getDocs(collection(db, "invoices")),
                getDocs(collection(db, "payments"))
            ]);

            const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            
            // --- New Stats Logic ---
            const today = new Date();
            const currentMonth = getMonth(today);
            const currentYear = getYear(today);
            const startOfCurrentMonth = startOfMonth(today);
            const endOfCurrentMonth = endOfMonth(today);

            // 1. Total Omset (MRR)
            const totalOmset = customers.reduce((acc, c) => acc + c.packagePrice, 0);

            // 2. New Customers
            const newCustomers = customers.filter(c => c.installationDate && differenceInMonths(new Date(), parseISO(c.installationDate)) < 1).length;

            // 3. Tagihan Bulan Ini
            const thisMonthInvoices = invoices.filter(invoice => {
                const invoiceDate = parseISO(invoice.date);
                return getMonth(invoiceDate) === currentMonth && getYear(invoiceDate) === currentYear;
            });
            const thisMonthTotalBill = thisMonthInvoices.reduce((acc, inv) => acc + inv.amount, 0);
            const thisMonthInvoiceCount = thisMonthInvoices.length;

            // 4. Total Tunggakan (Arrears from previous months)
            const oldUnpaidInvoices = invoices.filter(invoice => {
                const invoiceDate = parseISO(invoice.date);
                return invoice.status === 'belum lunas' && invoiceDate < startOfCurrentMonth;
            });
            const totalArrears = oldUnpaidInvoices.reduce((acc, inv) => acc + inv.amount, 0);

            setStats({
                totalOmset,
                totalArrears,
                newCustomers,
                thisMonthTotalBill,
                thisMonthInvoiceCount,
            });

            // 5. Pie Chart Data (Current Month)
            const paidInvoicesCurrentMonth = thisMonthInvoices.filter(i => i.status === 'lunas').length;
            const unpaidInvoicesCurrentMonth = thisMonthInvoices.filter(i => i.status === 'belum lunas').length;
            
            setPieData([
                { name: 'Lunas', value: paidInvoicesCurrentMonth },
                { name: 'Belum Lunas', value: unpaidInvoicesCurrentMonth },
            ]);

            // 6. Payment Summary (Current Month)
            const monthlyPayments = payments.filter(payment => {
              const paymentDate = parseISO(payment.paymentDate);
              return paymentDate >= startOfCurrentMonth && paymentDate <= endOfCurrentMonth;
            });

            const summary = monthlyPayments.reduce(
              (acc, payment) => {
                const method = payment.paymentMethod || 'cash'; // Fallback for old data
                acc[method] = (acc[method] || 0) + payment.totalPayment;
                acc.total += payment.totalPayment;
                return acc;
              },
              { cash: 0, bri: 0, dana: 0, total: 0 } as any
            );
            setPaymentSummary(summary);

            // 7. Revenue Chart Data (Last 6 months)
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
                        revenueDataByMonth[monthName] += p.totalPayment;
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
    }
    
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
        <h1 className="text-3xl font-bold tracking-tight">Dasbor</h1>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <CardTitle className="text-sm font-medium">Tagihan Bulan Ini</CardTitle>
                    <Files className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Rp{stats.thisMonthTotalBill.toLocaleString('id-ID')}</div>
                    <p className="text-xs text-muted-foreground">
                        dari {stats.thisMonthInvoiceCount} faktur diterbitkan
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
            <CardTitle>Pembayaran Bulan Ini</CardTitle>
            <CardDescription>Ringkasan pembayaran yang diterima bulan ini berdasarkan metode.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Metode Pembayaran</TableHead>
                        <TableHead className="text-right">Total Diterima</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">Cash</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.cash.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">BRI</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.bri.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">DANA</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.dana.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                </TableBody>
                <TableRow className="bg-muted/50 font-bold text-base">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">Rp{paymentSummary.total.toLocaleString('id-ID')}</TableCell>
                </TableRow>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
            <CardHeader>
                <CardTitle>Status Pembayaran Faktur (Bulan Ini)</CardTitle>
                <CardDescription>Visualisasi faktur yang sudah dan belum dibayar bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Tooltip
                    contentStyle={{
                        background: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                    }}
                    formatter={(value: number, name: string) => [`${value} Faktur`, name]}
                    />
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        if (!percent || percent < 0.01) return null;
                        return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                        </text>
                        );
                    }}
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                    ))}
                    </Pie>
                    <Legend iconType="circle" />
                </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

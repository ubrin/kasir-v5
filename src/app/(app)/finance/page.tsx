
'use client'
import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice } from "@/lib/types";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Wallet, Users, FileClock, DollarSign, BookText, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"


const pieChartColors = ["hsl(142.1 76.2% 36.3%)", "hsl(0 84.2% 60.2%)"];

type StatsSummary = {
  totalIncome: number;
  totalExpense: number;
  totalOtherIncome: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netProfit: number;
  totalOmset: number;
  totalArrears: number;
  newCustomersCount: number;
  monthlyRevenueData: { month: string; revenue: number }[];
  pieData: { name: string; value: number; count: number }[];
  arrearsDetails: { id: string; name: string; amount: number }[];
  omsetDetails: { subscriptionMbps: number; packagePrice: number; count: number; total: number }[];
  newCustomers: { id: string; name: string; subscriptionMbps: number; packagePrice: number }[];
};

export default function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState<StatsSummary | null>(null);

  React.useEffect(() => {
    const statsDocRef = doc(db, "app-stats", "summary");
    
    const unsubscribe = onSnapshot(statsDocRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as StatsSummary);
      } else {
        // Data doesn't exist, we don't show an error anymore, just the "Data Belum Tersedia" state
        setStats(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch finance data:", error);
      toast({
          title: "Gagal memuat data",
          description: "Tidak dapat mengambil data keuangan.",
          variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleRefreshStats = async () => {
    setIsRefreshing(true);
    try {
        const functions = getFunctions();
        const runDataAggregation = httpsCallable(functions, 'manuallyAggregateStats');
        const result = await runDataAggregation();
        
        toast({
            title: "Data Sedang Diperbarui",
            description: "Statistik sedang dihitung ulang di server. Data akan diperbarui secara otomatis dalam beberapa saat.",
        });

    } catch (error) {
        console.error("Error refreshing stats:", error);
        toast({
            title: "Gagal Memperbarui Statistik",
            description: "Terjadi kesalahan saat mencoba memperbarui data.",
            variant: "destructive"
        });
    } finally {
        setIsRefreshing(false);
    }
  };


  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  if (!stats) {
     return (
        <div className="flex flex-col gap-8 items-center justify-center h-96">
            <Card className="max-w-lg text-center">
                <CardHeader>
                    <CardTitle>Data Statistik Belum Tersedia</CardTitle>
                    <CardDescription>
                       Data ringkasan keuangan dan statistik belum dibuat. Klik tombol di bawah untuk membuat data sekarang. Proses ini mungkin memakan waktu beberapa menit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRefreshStats} disabled={isRefreshing}>
                        {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Buat Data Statistik Sekarang
                    </Button>
                </CardContent>
            </Card>
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
        <Button onClick={handleRefreshStats} disabled={isRefreshing} variant="outline">
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Segarkan Data
        </Button>
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
            <Dialog>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Omset Potensial</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">Rp{stats.totalOmset.toLocaleString('id-ID')}</div>
                        <p className="text-xs text-muted-foreground">Potensi pendapatan bulanan</p>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                        <DialogTitle>Rincian Omset Potensial</DialogTitle>
                        <DialogDescription>
                            Rincian pendapatan bulanan potensial berdasarkan paket langganan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Deskripsi Paket</TableHead>
                                    <TableHead className="text-center">Pelanggan</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.omsetDetails.length > 0 ? stats.omsetDetails.map((detail, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">
                                        {detail.subscriptionMbps}Mbps @Rp{detail.packagePrice.toLocaleString('id-ID')}
                                    </TableCell>
                                    <TableCell className="text-center">x{detail.count}</TableCell>
                                    <TableCell className="text-right">Rp{detail.total.toLocaleString('id-ID')}</TableCell>
                                </TableRow>
                                )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Tidak ada data pelanggan.</TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

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
                 <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <DialogTitle>Pelanggan Baru Bulan Ini</DialogTitle>
                    <DialogDescription>
                        Berikut adalah daftar pelanggan yang bergabung pada bulan {format(new Date(), 'MMMM yyyy', {locale: id})}.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        {stats.newCustomers.length > 0 ? (
                            <div className="space-y-4">
                                {stats.newCustomers.map(customer => (
                                    <div key={customer.id} className="p-3 rounded-md bg-muted/50 text-sm">
                                        <p className="font-semibold">{customer.name}</p>
                                        <div className="flex justify-between text-muted-foreground mt-1">
                                            <span>Paket: {customer.subscriptionMbps} Mbps</span>
                                            <span>Harga: Rp{customer.packagePrice.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ): (
                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada pelanggan baru bulan ini.</p>
                        )}
                    </div>
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
                <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                        <DialogTitle>Rincian Tunggakan</DialogTitle>
                        <DialogDescription>
                            Daftar pelanggan yang memiliki tunggakan dari bulan-bulan sebelumnya.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead className="text-right">Jumlah Tunggakan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.arrearsDetails.length > 0 ? stats.arrearsDetails.map(detail => (
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
                    </div>
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
                <BarChart data={stats.monthlyRevenueData}>
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
                    <Pie data={stats.pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (!percent || percent < 0.01) return null;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>{`${(percent * 100).toFixed(0)}%`}</text>);
                    }}>
                    {stats.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />))}
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
             <Button asChild variant="outline">
                <Link href="/reports">
                    <BookText className="mr-2 h-4 w-4" />
                    Total Keuangan
                </Link>
            </Button>
        </div>
    </div>
  )
}

    
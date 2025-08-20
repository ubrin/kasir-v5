
'use client';

import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { id } from 'date-fns/locale';

type Stats = {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    lastUpdated?: string;
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    setLoading(true);
    const statsDocRef = doc(db, "app-stats", "summary");
    const unsubscribe = onSnapshot(statsDocRef, (doc) => {
        if (doc.exists()) {
            setStats(doc.data() as Stats);
        } else {
            setStats(null);
        }
        setLoading(false);
    }, (error) => {
        console.error("Failed to fetch stats:", error);
        toast({
            title: "Gagal memuat data",
            description: "Tidak dapat mengambil data keuangan total.",
            variant: "destructive"
        });
        setStats(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
        const functions = getFunctions(app);
        const aggregateStatsCallable = httpsCallable(functions, 'manuallyAggregateStats');
        await aggregateStatsCallable();
        toast({
            title: "Pembaruan Berhasil",
            description: "Data statistik telah berhasil diperbarui.",
        });
    } catch (error: any) {
         toast({
            title: "Gagal Memperbarui Statistik",
            description: error.message || "Terjadi kesalahan yang tidak diketahui.",
            variant: "destructive",
        });
    } finally {
        setRefreshing(false);
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
                    <CardTitle>Data Belum Tersedia</CardTitle>
                    <CardDescription>
                       Data statistik total belum dibuat. Klik tombol di bawah untuk membuatnya.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRefreshStats} disabled={refreshing}>
                        {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Buat & Segarkan Data
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
                <h1 className="text-3xl font-bold tracking-tight">Total Keuangan</h1>
                <p className="text-muted-foreground">
                    Ringkasan total dari semua pemasukan dan pengeluaran.
                    {stats.lastUpdated && ` Terakhir diperbarui: ${format(parseISO(stats.lastUpdated), 'd MMM yyyy, HH:mm', {locale: id})}`}
                </p>
            </div>
             <Button onClick={handleRefreshStats} disabled={refreshing} variant="outline">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Segarkan Data
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Ringkasan Keuangan Total</CardTitle>
                <CardDescription>Akumulasi dari seluruh riwayat keuangan bisnis Anda.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid gap-8 sm:grid-cols-3">
                    <div className="flex items-center gap-4">
                         <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                            <p className="text-2xl font-bold">Rp{stats.totalIncome.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                            <p className="text-2xl font-bold">Rp{stats.totalExpense.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                            <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Saldo Bersih</p>
                            <p className="text-2xl font-bold">Rp{stats.balance.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

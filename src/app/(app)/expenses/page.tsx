
'use client';

import * as React from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function ExpensesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<{ wajib: Expense[], angsuran: Expense[], lainnya: Expense[] }>({
    wajib: [],
    angsuran: [],
    lainnya: []
  });

  React.useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const expensesQuery = query(
          collection(db, "expenses"),
          where("date", "!=", null),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(expensesQuery);
        const allHistory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

        setHistory({
          wajib: allHistory.filter(exp => exp.category === 'utama'),
          angsuran: allHistory.filter(exp => exp.category === 'angsuran'),
          lainnya: allHistory.filter(exp => exp.category === 'lainnya')
        });

      } catch (error) {
        console.error("Error fetching expense history:", error);
        toast({
          title: "Gagal Memuat Riwayat",
          description: "Tidak dapat mengambil data riwayat pengeluaran.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [toast]);

  const renderHistoryTable = (data: Expense[], categoryName: string) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <p className="text-lg font-medium">Belum Ada Riwayat</p>
          <p className="text-muted-foreground">Tidak ada riwayat pengeluaran {categoryName} yang tercatat.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.date ? format(parseISO(item.date), "d MMMM yyyy", { locale: id }) : '-'}</TableCell>
              <TableCell className="text-right">Rp{item.amount.toLocaleString('id-ID')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengeluaran</h1>
          <p className="text-muted-foreground">Catat dan kelola semua pengeluaran Anda.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </div>
      
      <Tabs defaultValue="wajib" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wajib">Wajib</TabsTrigger>
          <TabsTrigger value="angsuran">Angsuran</TabsTrigger>
          <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
        </TabsList>
        <TabsContent value="wajib">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengeluaran Wajib</CardTitle>
              <CardDescription>
                Pengeluaran rutin bulanan seperti gaji atau sewa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderHistoryTable(history.wajib, 'wajib')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="angsuran">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Angsuran</CardTitle>
              <CardDescription>
                Cicilan atau pinjaman dengan tenor tertentu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderHistoryTable(history.angsuran, 'angsuran')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lainnya">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengeluaran Lainnya</CardTitle>
              <CardDescription>
                Pengeluaran insidental atau tidak rutin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderHistoryTable(history.lainnya, 'lainnya')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

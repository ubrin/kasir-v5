
'use client';

import * as React from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch, doc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from "@/lib/types";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState<{ wajib: Expense[], angsuran: Expense[], lainnya: Expense[] }>({
    wajib: [],
    angsuran: [],
    lainnya: []
  });
  const [history, setHistory] = React.useState<{ wajib: Expense[], angsuran: Expense[], lainnya: Expense[] }>({
    wajib: [],
    angsuran: [],
    lainnya: []
  });

  const fetchExpenses = React.useCallback(async () => {
    setLoading(true);
    try {
      const expensesQuery = query(collection(db, "expenses"));
      const querySnapshot = await getDocs(expensesQuery);
      const allExpenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

      const templates = {
        wajib: allExpenses.filter(exp => exp.category === 'utama' && !exp.date),
        angsuran: allExpenses.filter(exp => exp.category === 'angsuran' && !exp.date),
        lainnya: allExpenses.filter(exp => exp.category === 'lainnya' && !exp.date)
      };

      const historyRecords = {
        wajib: allExpenses.filter(exp => exp.category === 'utama' && exp.date).sort((a,b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()),
        angsuran: allExpenses.filter(exp => exp.category === 'angsuran' && exp.date).sort((a,b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()),
        lainnya: allExpenses.filter(exp => exp.category === 'lainnya' && exp.date).sort((a,b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()),
      };

      setExpenses(templates);
      setHistory(historyRecords);

    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Gagal Memuat Data",
        description: "Tidak dapat mengambil data pengeluaran.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handlePay = async (expense: Expense) => {
    try {
        const batch = writeBatch(db);

        // Create history record
        const historyRecord = {
            ...expense,
            date: format(new Date(), 'yyyy-MM-dd'),
        };
        delete (historyRecord as any).id;
        const historyRef = doc(collection(db, "expenses"));
        batch.set(historyRef, historyRecord);

        // Update installment tenor if applicable
        if (expense.category === 'angsuran' && expense.id) {
            const expenseRef = doc(db, "expenses", expense.id);
            batch.update(expenseRef, {
                paidTenor: increment(1)
            });
        }
        
        await batch.commit();

        toast({
            title: "Pembayaran Dicatat",
            description: `Pembayaran untuk ${expense.name} telah berhasil dicatat.`,
        });
        fetchExpenses();
    } catch (error) {
        console.error("Error recording payment:", error);
        toast({
            title: "Gagal Mencatat Pembayaran",
            variant: "destructive"
        });
    }
  };


  const renderPayableTable = (data: Expense[], categoryName: string) => {
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
          <p className="text-lg font-medium">Tidak Ada Tagihan</p>
          <p className="text-muted-foreground">Tidak ada tagihan {categoryName} yang perlu dibayar saat ini.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            {categoryName === 'angsuran' && <TableHead>Tenor</TableHead>}
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              {categoryName === 'angsuran' && (
                <TableCell>
                  <Badge variant="outline">
                    {item.paidTenor || 0} / {item.tenor}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-right">Rp{item.amount.toLocaleString('id-ID')}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                    {categoryName === 'angsuran' && (
                        <>
                            <Button size="icon" variant="outline">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button size="sm" onClick={() => handlePay(item)} disabled={(item.paidTenor || 0) >= (item.tenor || 0)}>
                        Bayar
                    </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
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
              <TableCell>{item.date ? format(new Date(item.date), "d MMMM yyyy", { locale: id }) : '-'}</TableCell>
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
        <TabsContent value="wajib" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran Wajib</CardTitle>
              <CardDescription>Pengeluaran rutin bulanan seperti gaji atau sewa.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderPayableTable(expenses.wajib, 'wajib')}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengeluaran Wajib</CardTitle>
            </CardHeader>
            <CardContent>
              {renderHistoryTable(history.wajib, 'wajib')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="angsuran" className="space-y-4">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle>Angsuran</CardTitle>
              <CardDescription>Cicilan atau pinjaman dengan tenor tertentu.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderPayableTable(expenses.angsuran, 'angsuran')}
            </CardContent>
          </Card>
           <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle>Riwayat Angsuran</CardTitle>
            </CardHeader>
            <CardContent>
              {renderHistoryTable(history.angsuran, 'angsuran')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lainnya" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran Lainnya</CardTitle>
              <CardDescription>Pengeluaran insidental atau tidak rutin.</CardDescription>
            </CardHeader>
            <CardContent>
               {renderPayableTable(expenses.lainnya, 'lainnya')}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengeluaran Lainnya</CardTitle>
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

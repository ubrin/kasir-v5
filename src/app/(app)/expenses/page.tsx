
'use client';

import * as React from "react";
import { collection, query, getDocs, addDoc, writeBatch, doc, increment, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from "@/lib/types";
import { format, getDate, getYear, getMonth, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ManageExpensesDialog } from "@/components/manage-expenses-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);

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

        const historyRecord: Omit<Expense, 'id'> = {
            name: expense.name,
            amount: expense.amount,
            category: expense.category,
            date: format(new Date(), 'yyyy-MM-dd'),
        };
        const historyRef = doc(collection(db, "expenses"));
        batch.set(historyRef, historyRecord);

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
  
  const handleExpenseAdded = async (newExpenseData: Omit<Expense, 'id'>) => {
    try {
        const dataToAdd: any = {
            name: newExpenseData.name,
            amount: newExpenseData.amount,
            category: newExpenseData.category,
        };
        
        if (newExpenseData.category === 'angsuran') {
            dataToAdd.tenor = newExpenseData.tenor;
            dataToAdd.paidTenor = 0;
            dataToAdd.dueDateDay = newExpenseData.dueDateDay;
        } else if (newExpenseData.category === 'utama') {
            dataToAdd.dueDateDay = newExpenseData.dueDateDay;
        }

        await addDoc(collection(db, "expenses"), dataToAdd);
        
        toast({
            title: "Pengeluaran Ditambahkan",
            description: `${newExpenseData.name} telah berhasil ditambahkan.`,
        });
        fetchExpenses();
    } catch (error) {
        console.error("Error adding expense:", error);
        toast({
            title: "Gagal Menambahkan",
            description: "Terjadi kesalahan saat menyimpan data.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteDoc(doc(db, "expenses", expenseToDelete.id));
      toast({
        title: "Templat Dihapus",
        description: `Templat pengeluaran ${expenseToDelete.name} telah berhasil dihapus.`,
        variant: "destructive"
      });
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Gagal Menghapus",
        variant: "destructive"
      });
    }
  };

  const getExpenseStatusBadge = (item: Expense) => {
    const isInstallmentPaidOff = item.category === 'angsuran' && (item.paidTenor || 0) >= (item.tenor || 0);
    if (isInstallmentPaidOff) {
        return <Badge className="bg-green-100 text-green-800">Lunas</Badge>;
    }
    
    if (!item.dueDateDay) return null;

    const today = new Date();
    const currentDay = getDate(today);
    const daysDiff = item.dueDateDay - currentDay;

    if (daysDiff < 0) {
        return <Badge variant="destructive">Jatuh Tempo</Badge>;
    }
    if (daysDiff === 0) {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Hari Ini</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Akan Datang</Badge>;
  };


  const renderPayableTable = (data: Expense[], categoryName: string) => {
    const showDueDateInfo = categoryName === 'wajib' || categoryName === 'angsuran';

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
            {showDueDateInfo && <TableHead>Jatuh Tempo</TableHead>}
            {showDueDateInfo && <TableHead>Status</TableHead>}
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
                   <Badge variant={(item.paidTenor || 0) >= (item.tenor || 0) ? "default" : "outline"} className={(item.paidTenor || 0) >= (item.tenor || 0) ? "bg-green-100 text-green-800" : ""}>
                    {item.paidTenor || 0} / {item.tenor}
                  </Badge>
                </TableCell>
              )}
               {showDueDateInfo && (
                <>
                  <TableCell>
                    {item.dueDateDay ? `Setiap tgl. ${item.dueDateDay}` : '-'}
                  </TableCell>
                  <TableCell>
                    {getExpenseStatusBadge(item)}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right">Rp{item.amount.toLocaleString('id-ID')}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => handlePay(item)} disabled={(item.paidTenor || 0) >= (item.tenor || 0)}>
                    {(item.paidTenor || 0) >= (item.tenor || 0) ? "Lunas" : "Bayar"}
                </Button>
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
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengeluaran</h1>
            <p className="text-muted-foreground">Catat dan kelola semua pengeluaran Anda.</p>
          </div>
          <AddExpenseDialog onExpenseAdded={handleExpenseAdded} />
        </div>
        
        <Tabs defaultValue="wajib" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wajib">Wajib</TabsTrigger>
            <TabsTrigger value="angsuran">Angsuran</TabsTrigger>
            <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
          </TabsList>
          <TabsContent value="wajib" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pengeluaran Wajib</CardTitle>
                  <CardDescription>Pengeluaran rutin bulanan seperti gaji atau sewa.</CardDescription>
                </div>
                 <ManageExpensesDialog 
                    expenses={expenses.wajib}
                    category="utama"
                    onDelete={handleDeleteClick}
                >
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Kelola
                    </Button>
                </ManageExpensesDialog>
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
            <Card className="bg-muted/20">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Angsuran</CardTitle>
                      <CardDescription>Cicilan atau pinjaman dengan tenor tertentu.</CardDescription>
                  </div>
                   <ManageExpensesDialog 
                      expenses={expenses.angsuran}
                      category="angsuran"
                      onDelete={handleDeleteClick}
                  >
                      <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Kelola
                      </Button>
                  </ManageExpensesDialog>
              </CardHeader>
              <CardContent>
                {renderPayableTable(expenses.angsuran, 'angsuran')}
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pengeluaran Lainnya</CardTitle>
                  <CardDescription>Pengeluaran insidental atau tidak rutin.</CardDescription>
                </div>
                 <ManageExpensesDialog 
                    expenses={expenses.lainnya} 
                    category="lainnya"
                    onDelete={handleDeleteClick}
                >
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Kelola
                    </Button>
                </ManageExpensesDialog>
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

       <AlertDialog open={!!expenseToDelete} onOpenChange={(isOpen) => !isOpen && setExpenseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus templat ini?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus templat pengeluaran <span className="font-bold">{expenseToDelete?.name}</span> secara permanen. Riwayat pembayaran yang sudah ada tidak akan terpengaruh.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Batal</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Ya, Hapus
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

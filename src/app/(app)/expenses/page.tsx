
'use client';

import * as React from "react";
import { collection, query, getDocs, addDoc, writeBatch, doc, increment, deleteDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from "@/lib/types";
import { format, getDate, getYear, getMonth, isSameMonth, isSameYear, parseISO, startOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Trash2, MoreHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { ManageExpensesDialog } from "@/components/manage-expenses-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const payWajibSchema = z.object({
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/\D/g, '');
        return cleaned === '' ? undefined : Number(cleaned);
      }
      return val;
    },
    z.number({required_error: "Jumlah harus diisi.", invalid_type_error: "Harus berupa angka"}).min(1, "Jumlah minimal 1")
  ),
});
type PayWajibFormValues = z.infer<typeof payWajibSchema>;

function PayWajibDialog({
  expense,
  open,
  onOpenChange,
  onConfirm,
}: {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (expense: Expense, amount: number) => void;
}) {
  const form = useForm<PayWajibFormValues>({
    resolver: zodResolver(payWajibSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ amount: undefined });
    }
  }, [open, form]);

  const onSubmit = (data: PayWajibFormValues) => {
    if (expense) {
      onConfirm(expense, data.amount);
      onOpenChange(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numberValue = parseInt(rawValue.replace(/\D/g, ''), 10);
    if (isNaN(numberValue)) {
      form.setValue('amount', undefined);
      e.target.value = '';
    } else {
      form.setValue('amount', numberValue);
      e.target.value = numberValue.toLocaleString('id-ID');
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Bayar: {expense.name}</DialogTitle>
              <DialogDescription>
                Masukkan jumlah pembayaran untuk pengeluaran ini.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Pembayaran (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="cth. 50.000"
                        {...field}
                        onChange={handleAmountChange}
                        value={field.value ? Number(field.value).toLocaleString('id-ID') : ''}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit">Catat Pembayaran</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function ExpensesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState<{ wajib: Expense[], angsuran: Expense[] }>({
    wajib: [],
    angsuran: [],
  });
  const [history, setHistory] = React.useState<{ wajib: Expense[], angsuran: Expense[], lainnyaThisMonth: Expense[], lainnyaByMonth: Record<string, Expense[]> }>({
    wajib: [],
    angsuran: [],
    lainnyaThisMonth: [],
    lainnyaByMonth: {}
  });
  const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);
  const [historyToDelete, setHistoryToDelete] = React.useState<Expense | null>(null);
  const [expenseToPay, setExpenseToPay] = React.useState<Expense | null>(null);
  const [isPayWajibDialogOpen, setIsPayWajibDialogOpen] = React.useState(false);


  const fetchExpenses = React.useCallback(async () => {
    setLoading(true);
    try {
      const expensesQuery = query(collection(db, "expenses"));
      const querySnapshot = await getDocs(expensesQuery);
      const allExpenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      
      const templates = {
        wajib: allExpenses.filter(exp => exp.category === 'utama' && !exp.date),
        angsuran: allExpenses.filter(exp => exp.category === 'angsuran' && !exp.date),
      };
      
      const allHistoryLainnya = allExpenses.filter(exp => exp.category === 'lainnya' && exp.date).sort((a,b) => parseISO(b.date!).getTime() - parseISO(a.date!).getTime());
      
      const today = new Date();
      const historyLainnyaThisMonth = allHistoryLainnya.filter(exp => {
          const expenseDate = parseISO(exp.date!);
          return isSameMonth(expenseDate, today) && isSameYear(expenseDate, today);
      });

      const groupedLainnya = allHistoryLainnya.reduce((acc, expense) => {
        const monthYear = format(parseISO(expense.date!), 'MMMM yyyy', { locale: id });
        if (!acc[monthYear]) {
          acc[monthYear] = [];
        }
        acc[monthYear].push(expense);
        return acc;
      }, {} as Record<string, Expense[]>);

      const historyRecords = {
        wajib: allExpenses.filter(exp => exp.category === 'utama' && exp.date).sort((a,b) => parseISO(b.date!).getTime() - parseISO(a.date!).getTime()),
        angsuran: allExpenses.filter(exp => exp.category === 'angsuran' && exp.date).sort((a,b) => parseISO(b.date!).getTime() - parseISO(a.date!).getTime()),
        lainnyaThisMonth: historyLainnyaThisMonth,
        lainnyaByMonth: groupedLainnya,
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

  const handlePay = async (expense: Expense, amount?: number) => {
    if (!expense.id) return;
    
    if (expense.category === 'utama' && amount === undefined) {
      setExpenseToPay(expense);
      setIsPayWajibDialogOpen(true);
      return;
    }

    const paymentAmount = expense.category === 'utama' ? amount : expense.amount;
    if (!paymentAmount) {
         toast({ title: "Jumlah tidak valid", variant: "destructive" });
         return;
    }

    try {
        const batch = writeBatch(db);
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        const historyRecord: Omit<Expense, 'id'> = {
            name: expense.name,
            amount: paymentAmount,
            category: expense.category,
            date: todayStr,
        };
        const historyRef = doc(collection(db, "expenses"));
        batch.set(historyRef, historyRecord);

        const expenseRef = doc(db, "expenses", expense.id);
        const updates: { [key: string]: any } = {};

        if (expense.category === 'angsuran') {
            updates.paidTenor = increment(1);
        }
        
        if (expense.category === 'utama' || expense.category === 'angsuran') {
            updates.lastPaidDate = todayStr;
        }

        if (Object.keys(updates).length > 0) {
            batch.update(expenseRef, updates);
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
            category: newExpenseData.category,
        };
        
        if (newExpenseData.amount) {
            dataToAdd.amount = newExpenseData.amount;
        }
        
        if (newExpenseData.category === 'lainnya') {
            dataToAdd.date = format(new Date(), 'yyyy-MM-dd');
        } else {
            if (newExpenseData.category === 'angsuran') {
                dataToAdd.tenor = newExpenseData.tenor;
                dataToAdd.paidTenor = 0;
            }
            if (newExpenseData.category === 'utama' || newExpenseData.category === 'angsuran') {
                 if (newExpenseData.dueDateDay) {
                    dataToAdd.dueDateDay = newExpenseData.dueDateDay;
                }
            }
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

  const handleExpenseUpdated = async (expenseToUpdate: Expense) => {
    try {
        const { id, ...dataToUpdate } = expenseToUpdate;
        const expenseRef = doc(db, "expenses", id);
        await updateDoc(expenseRef, dataToUpdate);

        toast({
            title: "Pengeluaran Diperbarui",
            description: `${expenseToUpdate.name} telah berhasil diperbarui.`,
        });
        fetchExpenses();
    } catch (error) {
        console.error("Error updating expense:", error);
        toast({
            title: "Gagal Memperbarui",
            description: "Terjadi kesalahan saat memperbarui data.",
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
        description: `Templat pengeluaran ${expenseToDelete.name} telah berhasil dihapus. Riwayat pembayarannya tetap tersimpan.`,
        variant: "destructive"
      });
      
      setExpenseToDelete(null);
      fetchExpenses();

    } catch (error) {
      console.error("Error deleting expense template:", error);
      toast({
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan saat menghapus templat.",
        variant: "destructive"
      });
    }
  };

  const handleHistoryDeleteClick = (item: Expense) => {
    setHistoryToDelete(item);
  };

  const confirmHistoryDelete = async () => {
    if (!historyToDelete) return;
    try {
        await deleteDoc(doc(db, "expenses", historyToDelete.id));
        toast({
            title: "Riwayat Dihapus",
            description: `Riwayat pembayaran untuk ${historyToDelete.name} telah berhasil dihapus.`,
            variant: "destructive"
        });
        setHistoryToDelete(null);
        fetchExpenses();
    } catch (error) {
        console.error("Error deleting history item:", error);
        toast({
            title: "Gagal Menghapus Riwayat",
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

    if (item.lastPaidDate) {
        const lastPaid = new Date(item.lastPaidDate);
        if (isSameMonth(today, lastPaid) && isSameYear(today, lastPaid)) {
            return <Badge className="bg-green-100 text-green-800">Sudah Dibayar</Badge>;
        }
    }
    
    const daysDiff = item.dueDateDay - currentDay;

    if (daysDiff < 0) {
        return <Badge variant="destructive">Jatuh Tempo</Badge>;
    }
    if (daysDiff === 0) {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Hari Ini</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Akan Datang</Badge>;
  };


  const renderPayableTable = (data: Expense[], categoryName: 'wajib' | 'angsuran') => {
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
          <p className="text-lg font-medium">Tidak Ada Templat</p>
          <p className="text-muted-foreground">Tidak ada templat tagihan {categoryName} yang perlu dibayar.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            {categoryName === 'angsuran' && <TableHead>Tenor</TableHead>}
            <TableHead>Jatuh Tempo</TableHead>
            <TableHead>Status</TableHead>
            {categoryName === 'angsuran' && <TableHead className="text-right">Jumlah</TableHead>}
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const isInstallmentPaidOff = item.category === 'angsuran' && (item.paidTenor || 0) >= (item.tenor || 0);
            
            let isPaidThisMonth = false;
            if (item.lastPaidDate) {
                const lastPaid = new Date(item.lastPaidDate);
                const today = new Date();
                isPaidThisMonth = isSameMonth(today, lastPaid) && isSameYear(today, lastPaid);
            }
            
            const isButtonDisabled = isInstallmentPaidOff || ((item.category === 'utama' || item.category === 'angsuran') && isPaidThisMonth);

            return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              {categoryName === 'angsuran' && (
                <TableCell>
                   <Badge variant={isInstallmentPaidOff ? "default" : "outline"} className={isInstallmentPaidOff ? "bg-green-100 text-green-800" : ""}>
                    {item.paidTenor || 0} / {item.tenor}
                  </Badge>
                </TableCell>
              )}
               <>
                  <TableCell>
                    {item.dueDateDay ? `Setiap tgl. ${item.dueDateDay}` : '-'}
                  </TableCell>
                  <TableCell>
                    {getExpenseStatusBadge(item)}
                  </TableCell>
                </>
              {categoryName === 'angsuran' && item.amount && (
                  <TableCell className="text-right">Rp{item.amount.toLocaleString('id-ID')}</TableCell>
              )}
              <TableCell className="text-right">
                <Button size="sm" onClick={() => handlePay(item)} disabled={isButtonDisabled}>
                    {isInstallmentPaidOff ? "Lunas" : isPaidThisMonth ? "Dibayar" : "Bayar"}
                </Button>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    );
  };
  
  const renderHistoryTable = (data: Expense[], categoryName: string, withActions: boolean = true) => {
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
          <p className="text-lg font-medium">Tidak Ada Riwayat</p>
          <p className="text-muted-foreground">Belum ada pembayaran yang tercatat.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            {withActions && <TableHead className="text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.date ? format(parseISO(item.date), 'd MMMM yyyy', { locale: id }) : ''}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right">Rp{(item.amount || 0).toLocaleString('id-ID')}</TableCell>
              {withActions && (
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => handleHistoryDeleteClick(item)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderGroupedHistory = (data: Record<string, Expense[]>) => {
    const sortedMonths = Object.keys(data).sort((a, b) => {
        const dateA = parse(a, 'MMMM yyyy', new Date(), { locale: id });
        const dateB = parse(b, 'MMMM yyyy', new Date(), { locale: id });
        return dateB.getTime() - dateA.getTime();
    });

    if (sortedMonths.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-lg font-medium">Tidak Ada Riwayat</p>
                <p className="text-muted-foreground">Belum ada pengeluaran 'Lainnya' yang tercatat.</p>
            </div>
        );
    }

    return (
        <Accordion type="multiple" className="w-full">
            {sortedMonths.map(month => {
                const expensesForMonth = data[month];
                const totalForMonth = expensesForMonth.reduce((sum, exp) => sum + (exp.amount || 0), 0);
                return (
                    <AccordionItem value={month} key={month}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>{month}</span>
                                <span className="font-semibold">Total: Rp{totalForMonth.toLocaleString('id-ID')}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            {renderHistoryTable(expensesForMonth, 'lainnya', true)}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
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
                    onEdit={handleExpenseUpdated}
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Angsuran</CardTitle>
                      <CardDescription>Cicilan atau pinjaman dengan tenor tertentu.</CardDescription>
                  </div>
                   <ManageExpensesDialog 
                      expenses={expenses.angsuran}
                      category="angsuran"
                      onDelete={handleDeleteClick}
                      onEdit={handleExpenseUpdated}
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
            <Card>
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
                <CardTitle>Riwayat Bulan Ini</CardTitle>
                <CardDescription>Pengeluaran insidental yang tercatat bulan ini.</CardDescription>
              </CardHeader>
              <CardContent>
                {renderHistoryTable(history.lainnyaThisMonth, 'lainnya')}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Semua Riwayat Pengeluaran Lainnya</CardTitle>
                <CardDescription>Seluruh pengeluaran insidental yang pernah tercatat, dikelompokkan per bulan.</CardDescription>
              </CardHeader>
              <CardContent>
                 {renderGroupedHistory(history.lainnyaByMonth)}
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
                    Tindakan ini akan menghapus templat pengeluaran <span className="font-bold">{expenseToDelete?.name}</span> secara permanen. Riwayat pembayarannya akan tetap tersimpan.
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

        <AlertDialog open={!!historyToDelete} onOpenChange={(isOpen) => !isOpen && setHistoryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus riwayat ini?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan menghapus riwayat pembayaran untuk <span className="font-bold">{historyToDelete?.name}</span> pada tanggal <span className="font-bold">{historyToDelete?.date ? format(parseISO(historyToDelete.date), 'd MMMM yyyy', {locale: id}) : ''}</span>. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setHistoryToDelete(null)}>Batal</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmHistoryDelete}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Ya, Hapus
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <PayWajibDialog
            expense={expenseToPay}
            open={isPayWajibDialogOpen}
            onOpenChange={setIsPayWajibDialogOpen}
            onConfirm={handlePay}
        />
    </>
  );
}

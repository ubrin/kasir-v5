
'use client';

import * as React from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { format, parse, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { collection, query, where, getDocs, doc, writeBatch, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit, Trash2, MoreHorizontal, CreditCard, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('id-ID');
};

// --- Dialogs ---

const ExpenseDialog = ({
  expense,
  onSave,
  children,
  defaultDate,
}: {
  expense?: Expense | null;
  onSave: (data: Partial<Omit<Expense, 'id'>>, id?: string) => Promise<void>;
  children: React.ReactNode;
  defaultDate: Date;
}) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState<number | string>('');
  const [category, setCategory] = React.useState<Expense['category']>('lainnya');
  const [date, setDate] = React.useState<Date | undefined>(defaultDate);
  const [dueDateDay, setDueDateDay] = React.useState<number|string>('');
  const [tenor, setTenor] = React.useState<number|string>('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(expense?.name || '');
      setAmount(expense?.amount || '');
      setCategory(expense?.category || 'lainnya');
      setDate(expense?.date ? parseISO(expense.date) : defaultDate);
      setDueDateDay(expense?.dueDateDay || '');
      setTenor(expense?.tenor || '');
      setNote(expense?.note || '');
    } else {
        setName('');
        setAmount('');
        setCategory('lainnya');
        setDate(defaultDate);
        setDueDateDay('');
        setTenor('');
        setNote('');
    }
  }, [open, expense, defaultDate]);

  const handleSave = async () => {
    const dataToSave: Partial<Omit<Expense, 'id'|'paidTenor'>> = {
      name,
      amount: Number(amount),
      category,
      note,
    };

    if (category === 'utama') {
        dataToSave.dueDateDay = Number(dueDateDay);
        dataToSave.date = undefined; // Ensure date is not set for 'utama'
    } else {
        dataToSave.date = date ? format(date, 'yyyy-MM-dd') : undefined;
        dataToSave.dueDateDay = undefined; // Ensure dueDateDay is not set
    }

    if (category === 'angsuran') {
        dataToSave.tenor = Number(tenor);
    } else {
        dataToSave.tenor = undefined; // Ensure tenor is not set for others
    }
    
    await onSave(dataToSave, expense?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Pengeluaran</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Gaji Karyawan" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Jumlah (Rp)</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="cth. 3000000" />
          </div>
          <div className="grid gap-3">
            <Label>Kategori</Label>
            <RadioGroup value={category} onValueChange={(v) => setCategory(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="utama" id="utama" /><Label htmlFor="utama" className="font-normal">Utama</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="angsuran" id="angsuran" /><Label htmlFor="angsuran" className="font-normal">Angsuran</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="lainnya" id="lainnya" /><Label htmlFor="lainnya" className="font-normal">Lainnya</Label></div>
            </RadioGroup>
          </div>
          
          {category === 'utama' && (
            <div className="grid gap-2">
              <Label htmlFor="dueDateDay">Jatuh Tempo Setiap Bulan (Tanggal)</Label>
              <Input id="dueDateDay" type="number" value={dueDateDay} onChange={(e) => setDueDateDay(e.target.value)} placeholder="cth. 15" />
            </div>
          )}
          {(category === 'angsuran' || category === 'lainnya') && (
            <div className="grid gap-2">
              <Label htmlFor="date">Tanggal {category === 'angsuran' ? 'Jatuh Tempo' : ''}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: localeId }) : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {category === 'angsuran' && (
            <div className="grid gap-2">
              <Label htmlFor="tenor">Tenor (Bulan)</Label>
              <Input id="tenor" type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} placeholder="cth. 12" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="note">Keterangan (Opsional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis catatan singkat..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={handleSave}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function ExpenseReportPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const periodStr = searchParams.get('period');
    const [period, setPeriod] = React.useState<Date | null>(null);

    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    
    React.useEffect(() => {
        if (periodStr) {
            try {
                const parsedDate = parse(periodStr, 'yyyy-MM', new Date());
                setPeriod(parsedDate);
            } catch (error) {
                console.error("Invalid period format:", error);
                notFound();
            }
        } else {
            notFound();
        }
    }, [periodStr]);

    const fetchExpenses = React.useCallback(async () => {
        if (!period) return;
        setLoading(true);
        try {
            const expensesCollection = collection(db, "expenses");
            const snapshot = await getDocs(expensesCollection);
            let allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

            const fromDate = startOfMonth(period);
            const toDate = endOfMonth(period);

            allExpenses = allExpenses.filter(exp => {
                if (exp.category === 'utama') return true;
                if (exp.date) {
                    const expDate = parseISO(exp.date);
                    return expDate >= fromDate && expDate <= toDate;
                }
                return false;
            });

            setExpenses(allExpenses);
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [period, toast]);

    React.useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSaveExpense = async (data: Partial<Omit<Expense, 'id'>>, id?: string) => {
        try {
            if (id) {
                const expenseRef = doc(db, 'expenses', id);
                await updateDoc(expenseRef, data);
                toast({ title: "Pengeluaran diperbarui" });
            } else {
                 toast({ title: "Gagal: Penambahan hanya bisa dari halaman ringkasan.", variant: "destructive" });
            }
            fetchExpenses();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal menyimpan", variant: "destructive" });
        }
    };
    
    const handleDeleteExpense = async (id: string) => {
        try {
            const batch = writeBatch(db);
            const expenseRef = doc(db, 'expenses', id);
            batch.delete(expenseRef);
            await batch.commit();
            toast({ title: "Pengeluaran dihapus", variant: "destructive" });
            fetchExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ title: "Gagal menghapus", variant: "destructive" });
        }
    };
    
    const handlePayInstallment = async (expense: Expense) => {
        if (expense.category !== 'angsuran' || !expense.tenor) return;
        const currentPaidTenor = expense.paidTenor || 0;
        if (currentPaidTenor >= expense.tenor) {
             toast({ title: "Angsuran sudah lunas", variant: "default" });
             return;
        }

        try {
            const expenseRef = doc(db, "expenses", expense.id);
            await updateDoc(expenseRef, {
                paidTenor: currentPaidTenor + 1
            });
            toast({ title: "Pembayaran angsuran berhasil", description: `Sisa tenor: ${expense.tenor - (currentPaidTenor + 1)} bulan.` });
            fetchExpenses();
        } catch (error) {
             console.error("Error paying installment:", error);
             toast({ title: "Gagal membayar angsuran", variant: "destructive" });
        }
    }

    const groupedExpenses = React.useMemo(() => {
        return expenses.reduce((acc, exp) => {
            (acc[exp.category] = acc[exp.category] || []).push(exp);
            return acc;
        }, {} as Record<Expense['category'], Expense[]>);
    }, [expenses]);
    
    const totals = React.useMemo(() => {
        return {
            utama: groupedExpenses.utama?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
            angsuran: groupedExpenses.angsuran?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
            lainnya: groupedExpenses.lainnya?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
        };
    }, [groupedExpenses]);

    const totalExpenseAmount = totals.utama + totals.angsuran + totals.lainnya;

    if (loading || !period) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/expenses')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rincian Pengeluaran</h1>
                    <p className="text-muted-foreground">
                        Periode: {format(period, 'MMMM yyyy', { locale: localeId })}. Total: <span className="font-bold">Rp{formatNumber(totalExpenseAmount)}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Pengeluaran Utama</CardTitle>
                        <CardDescription>Pengeluaran rutin bulanan. Total: <span className="font-bold text-destructive">Rp{formatNumber(totals.utama)}</span></CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Jatuh Tempo</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.utama?.length > 0 ? groupedExpenses.utama.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name}</TableCell>
                                        <TableCell>{`Setiap Tgl. ${expense.dueDateDay}`}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                     <ExpenseDialog onSave={handleSaveExpense} expense={expense} defaultDate={period}>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/> Ubah</DropdownMenuItem>
                                                    </ExpenseDialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pengeluaran Angsuran</CardTitle>
                        <CardDescription>Cicilan atau pembayaran bertahap. Total: <span className="font-bold text-destructive">Rp{formatNumber(totals.angsuran)}</span></CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.angsuran?.length > 0 ? groupedExpenses.angsuran.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name} {expense.tenor && <span className="text-muted-foreground text-xs">({expense.paidTenor || 0}/{expense.tenor})</span>}</TableCell>
                                        <TableCell>{expense.date && format(parseISO(expense.date), 'd MMM yyyy', { locale: localeId })}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePayInstallment(expense)}><CreditCard className="mr-2 h-4 w-4"/> Bayar Angsuran</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <ExpenseDialog onSave={handleSaveExpense} expense={expense} defaultDate={period}>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/> Ubah</DropdownMenuItem>
                                                    </ExpenseDialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pengeluaran Lainnya</CardTitle>
                        <CardDescription>Pengeluaran insidental atau tidak terduga. Total: <span className="font-bold text-destructive">Rp{formatNumber(totals.lainnya)}</span></CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedExpenses.lainnya?.length > 0 ? groupedExpenses.lainnya.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name}</TableCell>
                                        <TableCell>{expense.date && format(parseISO(expense.date), 'd MMM yyyy', { locale: localeId })}</TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                     <ExpenseDialog onSave={handleSaveExpense} expense={expense} defaultDate={period}>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Edit className="mr-2 h-4 w-4"/> Ubah</DropdownMenuItem>
                                                    </ExpenseDialog>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data secara permanen.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


'use client';

import * as React from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { addDoc as addFbDoc, collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { id as localeId } from 'date-fns/locale';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ExpenseDialog = ({
  onSave,
  children,
  expense,
}: {
  onSave: (data: Partial<Omit<Expense, 'id'>>, id?: string) => Promise<void>;
  children: React.ReactNode;
  expense?: Expense;
}) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState<number | string>('');
  const [category, setCategory] = React.useState<Expense['category']>('lainnya');
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [dueDateDay, setDueDateDay] = React.useState<number|string>('');
  const [tenor, setTenor] = React.useState<number|string>('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      if (expense) {
        setName(expense.name);
        setAmount(expense.amount);
        setCategory(expense.category);
        setNote(expense.note || '');
        if (expense.date) setDate(parseISO(expense.date));
        if (expense.dueDateDay) setDueDateDay(expense.dueDateDay);
        if (expense.tenor) setTenor(expense.tenor);
      } else {
        setName('');
        setAmount('');
        setCategory('lainnya');
        setDate(new Date());
        setDueDateDay('');
        setTenor('');
        setNote('');
      }
    }
  }, [open, expense]);

  const handleSave = async () => {
    const dataToSave: Partial<Omit<Expense, 'id'>> = {
      name,
      amount: Number(amount),
      category,
      note,
    };

    if (category === 'utama') {
        dataToSave.dueDateDay = Number(dueDateDay);
        dataToSave.date = undefined;
    } else {
        dataToSave.date = date ? format(date, 'yyyy-MM-dd') : undefined;
        dataToSave.dueDateDay = undefined;
    }

    if (category === 'angsuran') {
        dataToSave.tenor = Number(tenor);
        if (!expense) {
             dataToSave.paidTenor = 0;
        }
    } else {
        dataToSave.tenor = undefined;
        dataToSave.paidTenor = undefined;
    }
    
    await onSave(dataToSave, expense?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Ubah Pengeluaran" : "Tambah Pengeluaran Baru"}</DialogTitle>
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
                <div className="flex items-center space-x-2"><RadioGroupItem value="utama" id="utama" /><Label htmlFor="utama" className="font-normal cursor-pointer">Utama</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="angsuran" id="angsuran" /><Label htmlFor="angsuran" className="font-normal cursor-pointer">Angsuran</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="lainnya" id="lainnya" /><Label htmlFor="lainnya" className="font-normal cursor-pointer">Lainnya</Label></div>
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

export default function ExpensesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [monthlyExpenses, setMonthlyExpenses] = React.useState<Record<string, number>>({});

    const fetchExpenses = React.useCallback(async () => {
        setLoading(true);
        try {
            const expensesQuery = collection(db, "expenses");
            const snapshot = await getDocs(expensesQuery);
            const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            
            const groupedByMonth: Record<string, number> = {};
            const mainExpensesTotal = allExpenses
                .filter(e => e.category === 'utama')
                .reduce((sum, exp) => sum + exp.amount, 0);

            allExpenses.forEach(exp => {
                if (exp.category !== 'utama') {
                    const period = format(parseISO(exp.date!), 'yyyy-MM');
                    if (!groupedByMonth[period]) {
                        groupedByMonth[period] = 0;
                    }
                    groupedByMonth[period] += exp.amount;
                }
            });

            for(const period in groupedByMonth) {
                groupedByMonth[period] += mainExpensesTotal;
            }

            const currentMonthPeriod = format(new Date(), 'yyyy-MM');
            if (!groupedByMonth[currentMonthPeriod] && mainExpensesTotal > 0) {
                 groupedByMonth[currentMonthPeriod] = mainExpensesTotal;
            }
            
            const uniquePeriods = new Set(Object.keys(groupedByMonth));
            const allInvoicesSnapshot = await getDocs(collection(db, "invoices"));
            allInvoicesSnapshot.docs.forEach(doc => {
                 const period = format(parseISO(doc.data().date), 'yyyy-MM');
                 if(!uniquePeriods.has(period)) {
                     groupedByMonth[period] = mainExpensesTotal;
                 }
            });


            setMonthlyExpenses(groupedByMonth);

        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSaveExpense = async (data: Omit<Expense, 'id'|'paidTenor'>, id?: string) => {
        try {
            if (id) {
                await updateDoc(doc(db, "expenses", id), data);
                toast({ title: "Pengeluaran diperbarui" });
            } else {
                const dataToCreate: any = {...data};
                if(data.category === 'angsuran' && !data.paidTenor) {
                    dataToCreate.paidTenor = 0;
                }
                await addFbDoc(collection(db, "expenses"), dataToCreate);
                toast({ title: "Pengeluaran ditambahkan" });
            }
            fetchExpenses();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal menyimpan", variant: "destructive" });
        }
    };
    
    const sortedMonths = React.useMemo(() => {
        return Object.keys(monthlyExpenses).sort((a, b) => b.localeCompare(a));
    }, [monthlyExpenses]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Pengeluaran</h1>
                    <p className="text-muted-foreground">Catat dan kelola semua pengeluaran bisnis Anda.</p>
                </div>
                <ExpenseDialog onSave={handleSaveExpense}>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah</Button>
                </ExpenseDialog>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-16 w-16 animate-spin" />
                </div>
            ) : (
                sortedMonths.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedMonths.map(period => (
                            <Link key={period} href={`/expense-report?period=${period}`}>
                                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                    <CardHeader>
                                        <CardTitle>{format(parseISO(period + '-01'), 'MMMM yyyy', {locale: localeId})}</CardTitle>
                                        <CardDescription>Klik untuk melihat rincian</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                                        <p className="text-2xl font-bold text-destructive">Rp{monthlyExpenses[period].toLocaleString('id-ID')}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                            <p className="text-lg font-medium">Belum Ada Pengeluaran</p>
                            <p className="text-muted-foreground">Mulai dengan menambahkan pengeluaran baru.</p>
                        </CardContent>
                    </Card>
                )
            )}
        </div>
    );
}

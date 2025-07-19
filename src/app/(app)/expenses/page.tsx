
'use client';

import * as React from 'react';
import { format, parseISO, startOfMonth, addDoc as addFbDoc, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { id as localeId } from 'date-fns/locale';
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
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

const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('id-ID');
};

const ExpenseDialog = ({
  onSave,
  children,
}: {
  onSave: (data: Omit<Expense, 'id'|'paidTenor'>, id?: string) => Promise<void>;
  children: React.ReactNode;
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
    if (!open) {
        setName('');
        setAmount('');
        setCategory('lainnya');
        setDate(new Date());
        setDueDateDay('');
        setTenor('');
        setNote('');
    }
  }, [open]);

  const handleSave = async () => {
    const dataToSave: Omit<Expense, 'id'|'paidTenor'> = {
      name,
      amount: Number(amount),
      category,
      note,
    };

    if (category === 'utama') {
        dataToSave.dueDateDay = Number(dueDateDay);
    } else {
        dataToSave.date = date ? format(date, 'yyyy-MM-dd') : undefined;
    }

    if (category === 'angsuran') {
        dataToSave.tenor = Number(tenor);
    }
    
    await onSave(dataToSave);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
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
            const currentMonthPeriod = format(new Date(), 'yyyy-MM');

            allExpenses.forEach(exp => {
                let period = '';
                if (exp.category === 'utama') {
                    // Recurring expenses apply to the current month for summary
                    period = currentMonthPeriod;
                } else if (exp.date) {
                    period = format(parseISO(exp.date), 'yyyy-MM');
                }

                if (period) {
                    if (!groupedByMonth[period]) {
                        groupedByMonth[period] = 0;
                    }
                    groupedByMonth[period] += exp.amount;
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

    const handleSaveExpense = async (data: Omit<Expense, 'id'|'paidTenor'>) => {
        try {
            const dataToCreate: Omit<Expense, 'id'> = {...data, paidTenor: 0};
            if(data.category === 'angsuran') {
                (dataToCreate as Expense).paidTenor = 0;
            }
            await addFbDoc(collection(db, "expenses"), dataToCreate);
            toast({ title: "Pengeluaran ditambahkan" });
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
                <ExpenseDialog onSave={(data) => handleSaveExpense(data)}>
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
                                        <p className="text-2xl font-bold text-destructive">Rp{formatNumber(monthlyExpenses[period])}</p>
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

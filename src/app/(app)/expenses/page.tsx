
'use client';

import * as React from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Save, Trash2, Calendar as CalendarIcon, MoreHorizontal, Edit, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    return value.toLocaleString('id-ID');
};

const categoryMap: Record<Expense['category'], { label: string; className: string }> = {
    utama: { label: 'Utama', className: 'bg-blue-100 text-blue-800' },
    angsuran: { label: 'Angsuran', className: 'bg-yellow-100 text-yellow-800' },
    lainnya: { label: 'Lainnya', className: 'bg-gray-100 text-gray-800' },
};

// --- Dialogs ---

const ExpenseDialog = ({
  expense,
  onSave,
  children,
}: {
  expense?: Expense | null;
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
    if (open) {
      setName(expense?.name || '');
      setAmount(expense?.amount || '');
      setCategory(expense?.category || 'lainnya');
      setDate(expense?.date ? parseISO(expense.date) : new Date());
      setDueDateDay(expense?.dueDateDay || '');
      setTenor(expense?.tenor || '');
      setNote(expense?.note || '');
    } else {
        // Reset form when dialog closes
        setName('');
        setAmount('');
        setCategory('lainnya');
        setDate(new Date());
        setDueDateDay('');
        setTenor('');
        setNote('');
    }
  }, [open, expense]);

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
    
    await onSave(dataToSave, expense?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran Baru'}</DialogTitle>
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
            <Label htmlFor="category">Kategori</Label>
            <RadioGroup
                value={category}
                onValueChange={(v) => setCategory(v as any)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="utama" id="utama" />
                  <Label htmlFor="utama" className="font-normal">Utama</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="angsuran" id="angsuran" />
                  <Label htmlFor="angsuran" className="font-normal">Angsuran</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lainnya" id="lainnya" />
                  <Label htmlFor="lainnya" className="font-normal">Lainnya</Label>
                </div>
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

const DeleteDialog = ({ onConfirm }: { onConfirm: () => void }) => {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                 </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                    <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan dan akan menghapus data pengeluaran secara permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// --- Main Page Component ---

export default function ExpensesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const fetchExpenses = React.useCallback(async () => {
        if (!date?.from || !date?.to) return;
        setLoading(true);
        try {
            // Fetch all expenses and then filter, because Firestore can't query based on OR conditions for dates/duedays
            const expensesQuery = query(
                collection(db, "expenses"),
                orderBy("date", "desc")
            );
            const snapshot = await getDocs(expensesQuery);
            const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            
            const filteredExpenses = allExpenses.filter(exp => {
                if (exp.category === 'utama') {
                    // For now, show all recurring expenses regardless of date range.
                    // A more advanced filter could check if the due date falls within the range.
                    return true; 
                }
                if (exp.date) {
                    const expDate = parseISO(exp.date);
                    return expDate >= date.from! && expDate <= date.to!;
                }
                return false;
            });

            setExpenses(filteredExpenses);
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [date, toast]);

    React.useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSaveExpense = async (data: Omit<Expense, 'id'|'paidTenor'>, id?: string) => {
        try {
            if (id) {
                // When updating, we don't reset the paidTenor
                await updateDoc(doc(db, "expenses", id), data);
                toast({ title: "Pengeluaran diperbarui" });
            } else {
                // When adding a new one, paidTenor starts at 0 if it's an installment
                const dataToCreate = {...data};
                if(dataToCreate.category === 'angsuran') {
                    (dataToCreate as Expense).paidTenor = 0;
                }
                await addDoc(collection(db, "expenses"), dataToCreate);
                toast({ title: "Pengeluaran ditambahkan" });
            }
            fetchExpenses();
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal menyimpan", variant: "destructive" });
        }
    };

    const handleDeleteExpense = async (id: string) => {
        try {
            await deleteDoc(doc(db, "expenses", id));
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

    const totalExpenses = expenses.reduce((sum, exp) => {
        // Only sum expenses that fall within the current month for an accurate total
        const expDate = exp.date ? parseISO(exp.date) : new Date();
        const fallsInRange = exp.category === 'lainnya' && expDate >= date.from! && expDate <= date.to!;
        const isRecurringThisMonth = exp.category === 'utama'; // Simplified: assume recurring happens every month
        const isInstallmentThisMonth = exp.category === 'angsuran' && expDate >= date.from! && expDate <= date.to!;

        if (fallsInRange || isRecurringThisMonth || isInstallmentThisMonth) {
            return sum + exp.amount;
        }
        return sum;
    }, 0);


    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Pengeluaran</h1>
                    <p className="text-muted-foreground">Catat dan kelola semua pengeluaran bisnis Anda.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (date.to ? `${format(date.from, 'd MMM yyyy', {locale: localeId})} - ${format(date.to, 'd MMM yyyy', {locale: localeId})}` : format(date.from, 'd MMM yyyy', {locale: localeId})) : <span>Pilih tanggal</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="range" selected={date} onSelect={setDate} initialFocus locale={localeId}/>
                        </PopoverContent>
                    </Popover>
                    <ExpenseDialog onSave={(data) => handleSaveExpense(data)}>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah</Button>
                    </ExpenseDialog>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengeluaran</CardTitle>
                    <CardDescription>Total Pengeluaran (Periode Terpilih): <span className="font-bold text-destructive">Rp{formatNumber(totalExpenses)}</span></CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-16 w-16 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Nama Pengeluaran</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length > 0 ? expenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            {expense.category === 'utama' && `Setiap Tgl. ${expense.dueDateDay}`}
                                            {expense.category !== 'utama' && expense.date && format(parseISO(expense.date), 'd MMM yyyy', {locale: localeId})}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {expense.name}
                                            {expense.category === 'angsuran' && expense.tenor && (
                                                <span className="text-muted-foreground ml-2 text-xs">
                                                   ({expense.paidTenor || 0}/{expense.tenor})
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(categoryMap[expense.category].className)}>
                                                {categoryMap[expense.category].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">Rp{formatNumber(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {expense.category === 'angsuran' && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handlePayInstallment(expense)}>
                                                                <CreditCard className="mr-2 h-4 w-4"/> Bayar Angsuran
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    <ExpenseDialog onSave={(data, id) => handleSaveExpense(data, id)} expense={expense}>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Edit className="mr-2 h-4 w-4"/> Ubah
                                                        </DropdownMenuItem>
                                                    </ExpenseDialog>
                                                    <DeleteDialog onConfirm={() => handleDeleteExpense(expense.id)} />
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Tidak ada data pengeluaran pada periode ini.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

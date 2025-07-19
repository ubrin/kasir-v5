
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Expense } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Wallet, Banknote, Landmark } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const initialExpenseState = {
    bandwidth: '',
    listrik: '',
    angsuranBri: '',
    angsuranShopee: '',
    angsuranShopeeKet: '',
    lainnyaRp: '',
    lainnyaKet: '',
};

export default function MonthlyBookkeepingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [expenses, setExpenses] = React.useState<Expense | null>(null);
  const [expenseInput, setExpenseInput] = React.useState(initialExpenseState);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setExpenseInput(prev => ({ ...prev, [id]: value }));
  };

  React.useEffect(() => {
    const fetchData = async () => {
        if (!date?.from) return;
        setLoading(true);
        try {
            const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
            const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));

            // Fetch Payments
            const paymentsSnapshot = await getDocs(collection(db, "payments"));
            const paymentsList = paymentsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Payment))
                .filter(p => isWithinInterval(parseISO(p.paymentDate), { start: fromDate, end: toDate }));
            setPayments(paymentsList);
            
            // Fetch Expenses
            const expensesQuery = query(collection(db, "expenses"), where("periodFrom", "==", format(fromDate, 'yyyy-MM-dd')));
            const expensesSnapshot = await getDocs(expensesQuery);
            if (!expensesSnapshot.empty) {
                const expenseData = { id: expensesSnapshot.docs[0].id, ...expensesSnapshot.docs[0].data() } as Expense;
                setExpenses(expenseData);
                setExpenseInput({
                    bandwidth: String(expenseData.mainExpenses.bandwidth),
                    listrik: String(expenseData.mainExpenses.electricity),
                    angsuranBri: String(expenseData.installments.bri),
                    angsuranShopee: String(expenseData.installments.shopee),
                    angsuranShopeeKet: expenseData.installments.shopeeNote,
                    lainnyaRp: String(expenseData.otherExpenses.amount),
                    lainnyaKet: expenseData.otherExpenses.note,
                });
            } else {
                setExpenses(null);
                setExpenseInput(initialExpenseState);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Gagal Memuat Data",
                description: "Tidak dapat mengambil data dari database.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [date, toast]);

  const summary = React.useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        const amount = payment.totalPayment ?? payment.paidAmount; // Fallback for older data
        acc.total += amount;
        if (payment.paymentMethod === 'cash') acc.cash += amount;
        if (payment.paymentMethod === 'bri') acc.bri += amount;
        if (payment.paymentMethod === 'dana') acc.dana += amount;
        return acc;
      },
      { total: 0, cash: 0, bri: 0, dana: 0 }
    );
  }, [payments]);

  const handleSaveExpenses = async () => {
    if (!date?.from) {
        toast({ title: "Tanggal tidak valid", description: "Pilih periode tanggal terlebih dahulu.", variant: "destructive" });
        return;
    }

    const bandwidth = Number(expenseInput.bandwidth) || 0;
    const listrik = Number(expenseInput.listrik) || 0;
    const angsuranBri = Number(expenseInput.angsuranBri) || 0;
    const angsuranShopee = Number(expenseInput.angsuranShopee) || 0;
    const lainnyaRp = Number(expenseInput.lainnyaRp) || 0;
    
    const totalExpense = bandwidth + listrik + angsuranBri + angsuranShopee + lainnyaRp;

    const expenseData: Omit<Expense, 'id'> = {
        periodFrom: format(date.from, 'yyyy-MM-dd'),
        periodTo: format(date.to || date.from, 'yyyy-MM-dd'),
        mainExpenses: {
            bandwidth: bandwidth,
            electricity: listrik,
        },
        installments: {
            bri: angsuranBri,
            shopee: angsuranShopee,
            shopeeNote: expenseInput.angsuranShopeeKet,
        },
        otherExpenses: {
            amount: lainnyaRp,
            note: expenseInput.lainnyaKet,
        },
        totalExpense: totalExpense,
        createdAt: format(new Date(), 'yyyy-MM-dd'),
    };
    
    try {
        await addDoc(collection(db, "expenses"), expenseData);
        toast({
            title: "Pengeluaran Disimpan",
            description: `Total pengeluaran sebesar Rp${totalExpense.toLocaleString('id-ID')} berhasil dicatat.`
        });
    } catch (error) {
        console.error("Error saving expenses:", error);
        toast({
            title: "Gagal Menyimpan",
            description: "Terjadi kesalahan saat menyimpan data pengeluaran.",
            variant: "destructive"
        });
    }
  };
  

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Pembukuan Bulanan</h1>
            <p className="text-muted-foreground">Laporan pemasukan dan pengeluaran bisnis Anda.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={'outline'}
              className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'LLL dd, y', {locale: id})} - {format(date.to, 'LLL dd, y', {locale: id})}
                  </>
                ) : (
                  format(date.from, 'LLL dd, y', {locale: id})
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={id}
            />
          </PopoverContent>
        </Popover>
      </div>

       {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Ringkasan Pemasukan</CardTitle>
                        <CardDescription>
                            Total pemasukan berdasarkan periode yang dipilih.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pemasukan</p>
                            <p className="text-4xl font-bold">Rp{summary.total.toLocaleString('id-ID')}</p>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="flex items-center">
                                <Wallet className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">Cash</p>
                                    <p className="text-lg font-bold">Rp{summary.cash.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Landmark className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">BRI</p>
                                    <p className="text-lg font-bold">Rp{summary.bri.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Banknote className="h-6 w-6 text-muted-foreground" />
                                <div className="ml-4 flex-1">
                                    <p className="text-sm text-muted-foreground">DANA</p>
                                    <p className="text-lg font-bold">Rp{summary.dana.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Catat Pengeluaran</CardTitle>
                    <CardDescription>
                        Input semua pengeluaran operasional pada periode ini.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Pengeluaran Utama</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="bandwidth">Bandwidth (Rp)</Label>
                                    <Input id="bandwidth" type="number" placeholder="cth. 5000000" value={expenseInput.bandwidth} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="listrik">Listrik (Rp)</Label>
                                    <Input id="listrik" type="number" placeholder="cth. 1000000" value={expenseInput.listrik} onChange={handleInputChange} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Angsuran</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="angsuranBri">BRI (Rp)</Label>
                                    <Input id="angsuranBri" type="number" placeholder="cth. 2500000" value={expenseInput.angsuranBri} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="angsuranShopee">Shopee (Rp)</Label>
                                    <Input id="angsuranShopee" type="number" placeholder="cth. 500000" value={expenseInput.angsuranShopee} onChange={handleInputChange} />
                                     <Label htmlFor="angsuranShopeeKet" className="sr-only">Keterangan Shopee</Label>
                                    <Input id="angsuranShopeeKet" placeholder="Keterangan (misal: Pembelian router)" value={expenseInput.angsuranShopeeKet} onChange={handleInputChange} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Pengeluaran Lainnya</AccordionTrigger>
                             <AccordionContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="lainnyaRp">Jumlah (Rp)</Label>
                                    <Input id="lainnyaRp" type="number" placeholder="cth. 150000" value={expenseInput.lainnyaRp} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lainnyaKet">Keterangan</Label>
                                    <Textarea id="lainnyaKet" placeholder="cth. Biaya tak terduga, perbaikan alat, dll." value={expenseInput.lainnyaKet} onChange={handleInputChange} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleSaveExpenses}>Simpan Pengeluaran</Button>
                </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}

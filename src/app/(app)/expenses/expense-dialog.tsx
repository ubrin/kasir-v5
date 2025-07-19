
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { Expense } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const expenseSchema = z.object({
  name: z.string().min(1, { message: "Nama pengeluaran harus diisi." }),
  amount: z.preprocess(
    (a) => (a ? parseFloat(String(a)) : 0),
    z.number().min(1, "Jumlah harus lebih dari 0")
  ),
  category: z.enum(['utama', 'angsuran', 'lainnya'], {
    required_error: 'Pilih kategori pengeluaran.',
  }),
  date: z.date().optional(),
  dueDateDay: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().min(1, "Tanggal minimal 1").max(31, "Tanggal maksimal 31").optional()
  ),
  tenor: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().min(1, "Tenor minimal 1 bulan").optional()
  ),
  paidTenor: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().optional()
  ),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.category === 'utama' || data.category === 'angsuran') {
        if (!data.dueDateDay) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Jatuh tempo harus diisi.",
                path: ['dueDateDay'],
            });
        }
    }
    if (data.category === 'angsuran') {
        if (!data.tenor) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Tenor harus diisi.",
                path: ['tenor'],
            });
        }
    }
    if (data.category === 'lainnya') {
        if (!data.date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Tanggal harus diisi.",
                path: ['date'],
            });
        }
    }
});


type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
  expense?: Expense;
  onSaveSuccess: () => void;
  children: React.ReactNode;
}

export function ExpenseDialog({ expense, onSaveSuccess, children }: ExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense ? {
      ...expense,
      date: expense.date ? new Date(expense.date) : undefined,
    } : {
      name: '',
      amount: 0,
      category: 'lainnya',
      date: new Date(),
      note: '',
      paidTenor: 0,
    },
  });
  
  const selectedCategory = form.watch('category');

  React.useEffect(() => {
    if (expense) {
      form.reset({
        ...expense,
        date: expense.date ? new Date(expense.date) : undefined,
      });
    } else {
      form.reset({
        name: '',
        amount: 0,
        category: 'lainnya',
        date: new Date(),
        dueDateDay: undefined,
        tenor: undefined,
        paidTenor: 0,
        note: '',
      });
    }
  }, [expense, form, open]);

  const onSubmit = async (data: ExpenseFormValues) => {
    setLoading(true);
    try {
        const expenseData: Omit<Expense, 'id'> = {
            name: data.name,
            amount: data.amount,
            category: data.category,
            note: data.note,
        };

        if (data.category === 'utama' || data.category === 'angsuran') {
            expenseData.dueDateDay = data.dueDateDay;
        }

        if (data.category === 'lainnya' && data.date) {
            expenseData.date = format(data.date, 'yyyy-MM-dd');
        }

        if (data.category === 'angsuran') {
            expenseData.tenor = data.tenor;
             if (expense?.id) {
                expenseData.paidTenor = data.paidTenor || 0;
            } else {
                expenseData.paidTenor = 0;
            }
        }

        if (expense?.id) {
            await setDoc(doc(db, 'expenses', expense.id), expenseData, { merge: true });
            toast({ title: "Perubahan Disimpan", description: `Pengeluaran ${data.name} telah diperbarui.` });
        } else {
            await addDoc(collection(db, 'expenses'), expenseData);
            toast({ title: "Pengeluaran Ditambahkan", description: `${data.name} berhasil ditambahkan.` });
        }
        
        onSaveSuccess();
        setOpen(false);
    } catch (error) {
        console.error("Error saving expense:", error);
        toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>{expense ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran Baru'}</DialogTitle>
              <DialogDescription>
                Isi detail pengeluaran di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh] p-6 pt-2">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Pengeluaran</FormLabel>
                        <FormControl>
                            <Input placeholder="cth. Beli Router" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Jumlah (Rp)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="cth. 500000" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Kategori</FormLabel>
                            <FormControl>
                               <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex gap-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="utama" id="utama" />
                                        <FormLabel htmlFor="utama" className="font-normal cursor-pointer">Utama</FormLabel>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="angsuran" id="angsuran" />
                                        <FormLabel htmlFor="angsuran" className="font-normal cursor-pointer">Angsuran</FormLabel>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="lainnya" id="lainnya" />
                                        <FormLabel htmlFor="lainnya" className="font-normal cursor-pointer">Lainnya</FormLabel>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     
                    {(selectedCategory === 'utama' || selectedCategory === 'angsuran') && (
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="dueDateDay"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Jatuh Tempo</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Tanggal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {selectedCategory === 'angsuran' && (
                                <FormField
                                    control={form.control}
                                    name="tenor"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Tenor (bulan)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="cth. 12" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    )}

                    {selectedCategory === 'lainnya' && (
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Tanggal</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={'outline'}
                                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                        >
                                        {field.value ? (
                                            format(field.value, 'PPP', { locale: localeId })
                                        ) : (
                                            <span>Pilih tanggal</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Catatan</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Catatan tambahan (opsional)" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-2 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

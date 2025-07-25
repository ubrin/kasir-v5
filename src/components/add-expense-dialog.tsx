
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Expense } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


const addExpenseSchema = z.object({
  name: z.string().min(1, { message: "Nama pengeluaran harus diisi." }),
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        return Number(val.replace(/\./g, ''));
      }
      return val === '' ? undefined : val;
    },
    z.number({invalid_type_error: "Harus berupa angka"}).min(1, "Jumlah minimal 1").optional()
  ),
  category: z.enum(['utama', 'angsuran', 'lainnya'], {
    required_error: 'Kategori harus dipilih.',
  }),
  tenor: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({invalid_type_error: "Harus berupa angka"}).min(1, "Tenor minimal 1 bulan").optional()
  ),
   dueDateDay: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({invalid_type_error: "Harus berupa angka"}).min(1, "Tanggal minimal 1").max(31, "Tanggal maksimal 31").optional()
  ),
}).refine(data => {
    if (data.category === 'angsuran') {
        return data.tenor !== undefined && data.tenor > 0;
    }
    return true;
}, {
    message: "Tenor wajib diisi untuk kategori angsuran.",
    path: ["tenor"],
}).refine(data => {
    if (data.category === 'utama' || data.category === 'angsuran') {
        return data.dueDateDay !== undefined && data.dueDateDay > 0;
    }
    return true;
}, {
    message: "Tgl. jatuh tempo wajib diisi.",
    path: ["dueDateDay"],
}).refine(data => {
    if (data.category === 'angsuran' || data.category === 'lainnya') {
        return data.amount !== undefined && data.amount > 0;
    }
    return true;
}, {
    message: "Jumlah wajib diisi untuk kategori ini.",
    path: ["amount"],
});

type AddExpenseFormValues = z.infer<typeof addExpenseSchema>;

interface AddExpenseDialogProps {
  onExpenseAdded: (expense: Omit<Expense, 'id'>) => void;
}

export function AddExpenseDialog({ onExpenseAdded }: AddExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      name: '',
      amount: '' as any,
      category: undefined,
      tenor: '' as any,
      dueDateDay: '' as any,
    },
  });

  const watchCategory = form.watch('category');

  const onSubmit = (data: AddExpenseFormValues) => {
    const expenseData: Omit<Expense, 'id'> = {
        name: data.name,
        category: data.category,
        amount: data.category !== 'utama' ? Number(data.amount) : undefined,
        tenor: data.category === 'angsuran' ? Number(data.tenor) : undefined,
        dueDateDay: data.category === 'lainnya' ? undefined : Number(data.dueDateDay),
    };
    
    onExpenseAdded(expenseData);
    
    form.reset({
        name: '',
        amount: '' as any,
        category: undefined,
        tenor: '' as any,
        dueDateDay: '' as any,
    });
    setOpen(false);
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numberValue = parseInt(rawValue.replace(/\D/g, ''), 10);
    if (isNaN(numberValue)) {
      form.setValue('amount', 0 as any);
      e.target.value = '';
    } else {
      form.setValue('amount', numberValue as any);
      e.target.value = numberValue.toLocaleString('id-ID');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Tambah Pengeluaran</DialogTitle>
              <DialogDescription>
                Isi rincian di bawah. Untuk 'Lainnya', data akan langsung tercatat sebagai pengeluaran hari ini.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <div className="p-6 pt-0">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Pengeluaran</FormLabel>
                        <FormControl>
                            <Input placeholder="cth. Beli ATK" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Kategori</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-3 gap-2"
                            >
                              <FormItem>
                                <RadioGroupItem value="utama" id="utama" className="sr-only" />
                                <Label
                                  htmlFor="utama"
                                  className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    field.value === 'utama' && "border-primary"
                                  )}
                                >
                                  Wajib
                                </Label>
                              </FormItem>
                              <FormItem>
                                <RadioGroupItem value="angsuran" id="angsuran" className="sr-only" />
                                 <Label
                                  htmlFor="angsuran"
                                  className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    field.value === 'angsuran' && "border-primary"
                                  )}
                                >
                                  Angsuran
                                </Label>
                              </FormItem>
                               <FormItem>
                                <RadioGroupItem value="lainnya" id="lainnya" className="sr-only" />
                                 <Label
                                  htmlFor="lainnya"
                                  className={cn(
                                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    field.value === 'lainnya' && "border-primary"
                                  )}
                                >
                                  Lainnya
                                </Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     
                    {(watchCategory === 'angsuran' || watchCategory === 'lainnya') && (
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Jumlah (Rp)</FormLabel>
                                <FormControl>
                                    <Input 
                                    type="text" 
                                    placeholder="cth. 50.000" 
                                    {...field}
                                    onChange={handleAmountChange}
                                    value={field.value ? Number(field.value).toLocaleString('id-ID') : ''}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    
                    {(watchCategory === 'utama' || watchCategory === 'angsuran') && (
                      <FormField
                          control={form.control}
                          name="dueDateDay"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Tgl. Jatuh Tempo</FormLabel>
                              <FormControl>
                                  <Input type="number" placeholder="Setiap tgl. 1-31" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                    )}

                    {watchCategory === 'angsuran' && (
                         <FormField
                            control={form.control}
                            name="tenor"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tenor (Bulan)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="cth. 12" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

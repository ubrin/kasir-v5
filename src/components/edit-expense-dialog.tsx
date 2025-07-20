
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
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
import type { Expense } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit } from 'lucide-react';

const editExpenseSchema = z.object({
  name: z.string().min(1, { message: "Nama pengeluaran harus diisi." }),
  amount: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({required_error: "Jumlah harus diisi.", invalid_type_error: "Harus berupa angka"}).min(1, "Jumlah minimal 1")
  ),
  tenor: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({invalid_type_error: "Harus berupa angka"}).min(1, "Tenor minimal 1 bulan").optional()
  ),
  dueDateDay: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({invalid_type_error: "Harus berupa angka"}).min(1, "Tanggal minimal 1").max(31, "Tanggal maksimal 31").optional()
  ),
});

type EditExpenseFormValues = z.infer<typeof editExpenseSchema>;

interface EditExpenseDialogProps {
  expense: Expense;
  onExpenseUpdated: (expense: Expense) => void;
  children: React.ReactNode;
}

export function EditExpenseDialog({ expense, onExpenseUpdated, children }: EditExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: {
      name: expense.name,
      amount: expense.amount,
      dueDateDay: expense.dueDateDay || undefined,
      tenor: expense.tenor || undefined,
    },
  });
  
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: expense.name,
        amount: expense.amount,
        dueDateDay: expense.dueDateDay || undefined,
        tenor: expense.tenor || undefined,
      });
    }
  }, [open, expense, form]);

  const onSubmit = (data: EditExpenseFormValues) => {
    onExpenseUpdated({
      ...expense,
      ...data,
      amount: Number(data.amount),
      dueDateDay: data.dueDateDay ? Number(data.dueDateDay) : undefined,
      tenor: data.tenor ? Number(data.tenor) : undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>Ubah Pengeluaran</DialogTitle>
              <DialogDescription>
                Perbarui detail untuk templat pengeluaran ini.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-auto">
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Pengeluaran</FormLabel>
                        <FormControl>
                          <Input placeholder="cth. Gaji Karyawan" {...field} />
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
                          <Input type="number" placeholder="cth. 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(expense.category === 'utama' || expense.category === 'angsuran') && (
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
                  {expense.category === 'angsuran' && (
                    <FormField
                      control={form.control}
                      name="tenor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Tenor (Bulan)</FormLabel>
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
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

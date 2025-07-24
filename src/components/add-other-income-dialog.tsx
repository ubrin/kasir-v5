
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle } from 'lucide-react';

const otherIncomeSchema = z.object({
  name: z.string().min(1, 'Nama pemasukan harus diisi.'),
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const cleaned = val.replace(/\D/g, '');
        return cleaned === '' ? undefined : Number(cleaned);
      }
      return val;
    },
    z.number({ required_error: 'Jumlah harus diisi.', invalid_type_error: 'Harus berupa angka' }).min(1, 'Jumlah minimal 1')
  ),
});

type OtherIncomeFormValues = z.infer<typeof otherIncomeSchema>;

interface OtherIncomeDialogProps {
  onConfirm: (data: OtherIncomeFormValues) => void;
}

export function AddOtherIncomeDialog({ onConfirm }: OtherIncomeDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<OtherIncomeFormValues>({
    resolver: zodResolver(otherIncomeSchema),
    defaultValues: {
      name: '',
      amount: undefined,
    },
  });

  const onSubmit = (data: OtherIncomeFormValues) => {
    onConfirm(data);
    form.reset();
    setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Pemasukan Lainnya
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Tambah Pemasukan Lainnya</DialogTitle>
              <DialogDescription>
                Catat pemasukan di luar dari tagihan pelanggan, seperti penjualan perangkat.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pemasukan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Penjualan Router" {...field} />
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
                       <Input
                        type="text"
                        placeholder="cth. 250.000"
                        {...field}
                        onChange={handleAmountChange}
                        value={field.value ? Number(field.value).toLocaleString('id-ID') : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

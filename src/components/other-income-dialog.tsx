
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import type { OtherIncome } from '@/lib/types';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

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
  otherIncomes: OtherIncome[];
  onAddIncome: (data: OtherIncomeFormValues) => void;
  onDeleteIncome: (income: OtherIncome) => void;
}

export function OtherIncomeDialog({ otherIncomes, onAddIncome, onDeleteIncome }: OtherIncomeDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [incomeToDelete, setIncomeToDelete] = React.useState<OtherIncome | null>(null);
  const form = useForm<OtherIncomeFormValues>({
    resolver: zodResolver(otherIncomeSchema),
    defaultValues: {
      name: '',
      amount: undefined,
    },
  });

  const onSubmit = (data: OtherIncomeFormValues) => {
    onAddIncome(data);
    form.reset();
    // Keep dialog open to see the new entry
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
  
  const handleDeleteConfirm = () => {
    if (incomeToDelete) {
        onDeleteIncome(incomeToDelete);
        setIncomeToDelete(null);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Pemasukan Lainnya
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Pemasukan Lainnya</DialogTitle>
              <DialogDescription>
                Catat pemasukan di luar tagihan, atau lihat riwayat pemasukan lainnya.
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
              <Button type="submit">Tambah</Button>
            </DialogFooter>
          </form>
        </Form>
        <Separator className="my-4" />
        <div>
            <h3 className="text-md font-semibold mb-2">Riwayat Pemasukan Lainnya</h3>
            <ScrollArea className="h-64">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-right w-12">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {otherIncomes.length > 0 ? otherIncomes.map((income) => (
                            <TableRow key={income.id}>
                                <TableCell>{format(parseISO(income.date), 'dd/MM/yy', {locale: id})}</TableCell>
                                <TableCell className="font-medium">{income.name}</TableCell>
                                <TableCell className="text-right">Rp{income.amount.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Buka menu</span>
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => setIncomeToDelete(income)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Belum ada pemasukan lainnya yang dicatat.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
     <AlertDialog open={!!incomeToDelete} onOpenChange={(isOpen) => !isOpen && setIncomeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menghapus data pemasukan <span className="font-bold">{incomeToDelete?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90"
            >
                Ya, Hapus
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

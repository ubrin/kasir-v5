
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import type { Customer } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';


const addCustomerSchema = z.object({
  name: z.string().min(1, { message: "Nama harus diisi." }),
  address: z.string().min(1, { message: "Alamat harus diisi." }),
  phone: z.string().optional(),
  dueDateCode: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({required_error: "Tgl jatuh tempo harus diisi.", invalid_type_error: "Harus berupa angka"}).min(1, "Tanggal minimal 1").max(31, "Tanggal maksimal 31")
  ),
  subscriptionMbps: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({required_error: "Paket harus diisi.", invalid_type_error: "Harus berupa angka"}).min(1, "Kecepatan minimal 1 Mbps")
  ),
  packagePrice: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({required_error: "Harga paket harus diisi.", invalid_type_error: "Harus berupa angka"}).min(0, "Harga paket tidak boleh negatif")
  ),
  installationDate: z.date({
    required_error: 'Tanggal pemasangan harus diisi.',
  }),
});

type AddCustomerFormValues = z.infer<typeof addCustomerSchema>;

interface AddCustomerDialogProps {
  onCustomerAdded: (customer: Omit<Customer, 'id' | 'outstandingBalance'>) => void;
}

export function AddCustomerDialog({ onCustomerAdded }: AddCustomerDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<AddCustomerFormValues>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      dueDateCode: '' as any,
      subscriptionMbps: '' as any,
      packagePrice: '' as any,
      installationDate: new Date(),
    },
  });

  const onSubmit = (data: AddCustomerFormValues) => {
    onCustomerAdded({
        ...data,
        installationDate: format(data.installationDate, 'yyyy-MM-dd'),
    });
    form.reset({
        name: '',
        address: '',
        phone: '',
        dueDateCode: '' as any,
        subscriptionMbps: '' as any,
        packagePrice: '' as any,
        installationDate: new Date(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pelanggan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh] p-6">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Pelanggan</FormLabel>
                        <FormControl>
                            <Input placeholder="cth. Budi Santoso" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Alamat</FormLabel>
                        <FormControl>
                            <Input placeholder="cth. Jl. Merdeka No. 1" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>No. WhatsApp</FormLabel>
                        <FormControl>
                            <Input placeholder="cth. 6281234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="installationDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Pemasangan</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, 'PPP', { locale: id })
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
                                    disabled={(date) =>
                                    date > new Date() || date < new Date('1900-01-01')
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="subscriptionMbps"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Paket (Mbps)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="cth. 50" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDateCode"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tgl Jatuh Tempo</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="cth. 10" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="packagePrice"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Harga Paket (Rp)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="cth. 150000" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-2 border-t">
              <Button type="submit">Simpan Pelanggan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

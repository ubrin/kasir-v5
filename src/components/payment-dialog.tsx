
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Customer, Invoice, Collector, Payment } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { collection, onSnapshot, writeBatch, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const paymentSchema = z.object({
  selectedInvoices: z.array(z.string()).nonempty({
    message: 'Pilih setidaknya satu faktur untuk dibayar.',
  }),
  paymentMethod: z.enum(['cash', 'bri', 'dana'], {
    required_error: 'Pilih metode pembayaran.',
  }),
  paymentDate: z.date({
    required_error: 'Tanggal pembayaran harus diisi.',
  }),
  discountType: z.enum(['rp', 'percentage']),
  discountValue: z.preprocess(
    (a) => (a ? parseFloat(String(a).replace(/[^0-9.]/g, '')) : 0),
    z.number().min(0, "Diskon tidak boleh negatif").optional()
  ),
  paidAmount: z.preprocess(
    (a) => (a ? parseInt(String(a).replace(/\D/g, ''), 10) : 0),
    z.number().min(0, "Jumlah dibayar tidak boleh negatif")
  ),
  collectorId: z.string({ required_error: 'Penagih harus dipilih.' }),
}).refine(data => {
    if (data.discountType === 'percentage') {
        return data.discountValue === undefined || (data.discountValue >= 0 && data.discountValue <= 100);
    }
    return true;
}, {
    message: "Diskon persen harus antara 0 dan 100",
    path: ["discountValue"],
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type DelinquentCustomer = Customer & {
  overdueAmount: number;
  invoices: Invoice[];
};

interface PaymentDialogProps {
  customer: DelinquentCustomer;
  onPaymentSuccess: () => void;
}

export function PaymentDialog({ customer, onPaymentSuccess }: PaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [collectors, setCollectors] = React.useState<Collector[]>([]);
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      discountValue: 0,
      discountType: 'rp',
      paymentMethod: 'cash',
      selectedInvoices: [],
      paidAmount: 0,
      collectorId: undefined,
    },
  });

  const { handleSubmit, control, watch, reset, setValue, formState: { errors } } = form;

  const selectedInvoices = watch('selectedInvoices') || [];
  const discountValue = watch('discountValue') || 0;
  const discountType = watch('discountType');
  const paidAmount = watch('paidAmount') || 0;
  const creditBalance = customer.creditBalance ?? 0;

  React.useEffect(() => {
    if (open) {
        const unsubscribe = onSnapshot(collection(db, "collectors"), (snapshot) => {
            const collectorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collector)).sort((a,b) => a.name.localeCompare(b.name));
            setCollectors(collectorsList);
            if (collectorsList.length > 0 && !watch('collectorId')) {
                setValue('collectorId', collectorsList[0].id);
            }
        });
        return () => unsubscribe();
    }
  }, [open, watch, setValue]);

  const billToPay = React.useMemo(() => {
    return customer.invoices
      .filter(invoice => selectedInvoices.includes(invoice.id))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
  }, [customer.invoices, selectedInvoices]);
  
  const discountAmount = React.useMemo(() => {
     if (discountType === 'percentage') {
        return (billToPay * discountValue) / 100;
     }
     return Math.min(billToPay, discountValue);
  }, [billToPay, discountValue, discountType]);

  const billAfterDiscount = billToPay - discountAmount;
  const creditApplied = Math.min(creditBalance, billAfterDiscount);
  const totalPayment = Math.max(0, billAfterDiscount - creditApplied);
  const paymentDifference = paidAmount - totalPayment;
  
  // This is the core fix. It listens to any changes that affect the final bill
  // and intelligently updates the `paidAmount` field.
  React.useEffect(() => {
    // This effect runs when the bill total, discount, or credit changes.
    // It resets the `paidAmount` to the new correct total.
    setValue('paidAmount', Math.round(totalPayment));
  }, [totalPayment, setValue]);


  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numberValue = parseInt(rawValue.replace(/\D/g, ''), 10);
    setValue('paidAmount', isNaN(numberValue) ? 0 : numberValue);
    e.target.value = isNaN(numberValue) ? '' : numberValue.toLocaleString('id-ID');
  };

  const onSubmit = async (data: PaymentFormValues) => {
    const selectedCollector = collectors.find(c => c.id === data.collectorId);
    if (!selectedCollector) {
      toast({ title: "Penagih tidak valid", variant: "destructive" });
      return;
    }

    try {
        const batch = writeBatch(db);
        const paymentId = uuidv4();
        const paymentRef = doc(db, 'payments', paymentId);

        const newPayment: Payment = {
            id: paymentId,
            customerId: customer.id,
            customerName: customer.name,
            paymentDate: format(data.paymentDate, 'yyyy-MM-dd HH:mm:ss'),
            paymentMethod: data.paymentMethod,
            invoiceIds: data.selectedInvoices,
            totalBill: billToPay,
            discount: discountAmount,
            totalPayment: totalPayment,
            paidAmount: data.paidAmount,
            changeAmount: Math.max(0, paymentDifference),
            collectorId: data.collectorId,
            collectorName: selectedCollector.name,
        };
        batch.set(paymentRef, newPayment);

        for (const invoiceId of data.selectedInvoices) {
            const invoiceRef = doc(db, 'invoices', invoiceId);
            batch.update(invoiceRef, { status: 'lunas' });
        }

        const customerRef = doc(db, 'customers', customer.id);
        const newCreditBalance = creditBalance - creditApplied + Math.max(0, paymentDifference);
        batch.update(customerRef, {
            creditBalance: newCreditBalance,
            outstandingBalance: increment(-billToPay)
        });

        await batch.commit();
        onPaymentSuccess();
        setOpen(false);
        reset();
    } catch (error) {
        console.error("Error processing payment:", error);
        toast({
            title: "Gagal Memproses Pembayaran",
            description: "Terjadi kesalahan saat menyimpan data.",
            variant: "destructive",
        });
    }
  };

  React.useEffect(() => {
    if (open) {
      const allUnpaidInvoiceIds = customer.invoices.map(inv => inv.id);
      setValue('selectedInvoices', allUnpaidInvoiceIds);
      if (collectors.length > 0) {
        setValue('collectorId', collectors[0].id);
      }
    } else {
      reset({
        paymentDate: new Date(),
        discountValue: 0,
        discountType: 'rp',
        paymentMethod: 'cash',
        selectedInvoices: [],
        paidAmount: 0,
        collectorId: undefined,
      });
    }
  }, [open, customer.invoices, setValue, reset, collectors]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={(e) => e.stopPropagation()}>
          Bayar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>{customer.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label>Pilih Tagihan</Label>
                  <Controller
                    name="selectedInvoices"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2 rounded-md border p-3">
                        {customer.invoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={invoice.id}
                                checked={field.value?.includes(invoice.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), invoice.id])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== invoice.id
                                        )
                                      );
                                }}
                              />
                              <Label htmlFor={invoice.id} className="font-normal cursor-pointer">
                                {format(parseISO(invoice.date), 'MMMM yyyy', { locale: id })}
                              </Label>
                            </div>
                            <span className="text-sm font-medium">Rp{invoice.amount.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.selectedInvoices && <p className="text-sm text-destructive">{errors.selectedInvoices.message}</p>}
                </div>

                <div className="grid gap-3">
                  <Label>Diterima Oleh</Label>
                  <Controller
                    name="collectorId"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-2 rounded-md border p-3"
                      >
                        {collectors.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-2">Tidak ada penagih. Tambahkan penagih di halaman Daftar Penagih.</p>
                        ) : (
                          collectors.map(c => (
                            <div key={c.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={c.id} id={c.id} />
                              <Label htmlFor={c.id} className="font-normal">{c.name}</Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    )}
                  />
                  {errors.collectorId && <p className="text-sm text-destructive">{errors.collectorId.message}</p>}
                </div>


                <div className="grid gap-3">
                  <Label>Metode Pembayaran</Label>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <Label htmlFor="cash">Cash</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bri" id="bri" />
                            <Label htmlFor="bri">BRI</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dana" id="dana" />
                            <Label htmlFor="dana">DANA</Label>
                        </div>
                        </RadioGroup>
                    )}
                  />
                  {errors.paymentMethod && <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>}
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="paymentDate">Tanggal Pembayaran</Label>
                  <Controller
                    name="paymentDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP', { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label>Rincian Tagihan</Label>
                    <div className="border rounded-md p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Tagihan</span>
                        <span className="font-medium">Rp{billToPay.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diskon</span>
                        <span className="font-medium text-green-600">- Rp{discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                      {creditApplied > 0 && (
                        <div className="flex justify-between">
                          <span>Saldo Digunakan</span>
                          <span className="font-medium text-blue-600">- Rp{creditApplied.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="discountValue">Diskon</Label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="discountValue"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="discountValue"
                            type="number"
                            placeholder="0"
                            className="flex-1"
                            onChange={e => field.onChange(e.target.value)}
                          />
                        )}
                      />
                      <Controller
                        name="discountType"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex rounded-md border bg-muted p-1"
                          >
                            <RadioGroupItem value="rp" id="rp" className="sr-only" />
                            <Label htmlFor="rp" className={cn("px-2 py-1 text-xs rounded-sm cursor-pointer", field.value === 'rp' && "bg-background shadow")}>Rp</Label>
                            
                            <RadioGroupItem value="percentage" id="percentage" className="sr-only"/>
                            <Label htmlFor="percentage" className={cn("px-2 py-1 text-xs rounded-sm cursor-pointer", field.value === 'percentage' && "bg-background shadow")}>%</Label>
                          </RadioGroup>
                        )}
                      />
                    </div>
                    {errors.discountValue && <p className="text-sm text-destructive">{errors.discountValue.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paidAmount">Jumlah Dibayar</Label>
                    <Controller
                      name="paidAmount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="paidAmount"
                          type="text"
                          placeholder="0"
                          onChange={handlePaidAmountChange}
                          value={field.value ? Number(field.value).toLocaleString('id-ID') : ''}
                        />
                      )}
                    />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <Label>Kembalian / Sisa Saldo</Label>
                    <p className={cn("font-semibold text-lg", paymentDifference < 0 ? "text-destructive" : "text-green-600")}>
                      {paymentDifference < 0 ? '- ' : ''}Rp{Math.abs(paymentDifference).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border bg-secondary/50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-secondary-foreground">Total Pembayaran</span>
                    <span className="text-xl font-bold text-primary">
                      Rp{totalPayment.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit">Konfirmasi Pembayaran</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    
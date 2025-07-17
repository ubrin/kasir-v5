
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Info } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO, getMonth, getYear } from 'date-fns';
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
import type { Customer, Invoice } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { invoices } from '@/lib/data';

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
  discount: z.preprocess(
    (a) => (a ? parseInt(String(a), 10) : 0),
    z.number().min(0).optional()
  ),
  paidAmount: z.preprocess(
    (a) => (a ? parseInt(String(a), 10) : 0),
    z.number().min(0)
  ),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type DelinquentCustomer = Customer & {
  overdueAmount: number;
  invoices: Invoice[];
};

interface PaymentDialogProps {
  customer: DelinquentCustomer;
  onPaymentSuccess: (customerId: string, customerName: string, paymentDetails: any) => void;
}

export function PaymentDialog({ customer, onPaymentSuccess }: PaymentDialogProps) {
  const [open, setOpen] = React.useState(false);

  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      discount: 0,
      paymentMethod: 'cash',
      selectedInvoices: [],
      paidAmount: 0,
    },
  });

  const selectedInvoices = watch('selectedInvoices') || [];
  const discount = watch('discount') || 0;
  const paidAmount = watch('paidAmount') || 0;

  const billToPay = React.useMemo(() => {
    return customer.invoices
      .filter(invoice => selectedInvoices.includes(invoice.id))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
  }, [customer.invoices, selectedInvoices]);

  const totalPayment = Math.max(0, billToPay - discount);
  const paymentDifference = paidAmount - totalPayment;

  React.useEffect(() => {
    setValue('paidAmount', totalPayment);
  }, [totalPayment, setValue]);

  const onSubmit = (data: PaymentFormValues) => {
    const paymentDetails = {
      ...data,
      totalPayment,
      changeAmount: Math.max(0, paymentDifference),
      shortageAmount: Math.max(0, -paymentDifference),
      discount,
    };
    onPaymentSuccess(customer.id, customer.name, paymentDetails);
    setOpen(false);
    reset();
  };

  React.useEffect(() => {
    if (open) {
        const today = new Date();
        const currentMonth = getMonth(today);
        const currentYear = getYear(today);

        // Find invoice for the current month among ALL customer's unpaid invoices
        const currentMonthInvoice = invoices.find(invoice => 
            invoice.customerId === customer.id &&
            invoice.status === 'belum lunas' &&
            getMonth(parseISO(invoice.date)) === currentMonth && 
            getYear(parseISO(invoice.date)) === currentYear
        );

        if (currentMonthInvoice) {
            setValue('selectedInvoices', [currentMonthInvoice.id]);
        } else {
            setValue('selectedInvoices', []);
        }
    } else {
        reset();
    }
}, [open, customer.id, setValue, reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={(e) => e.stopPropagation()}>
          Bayar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            {customer.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
            
            <div className="grid gap-3">
              <Label>Pilih Tagihan</Label>
              <Controller
                name="selectedInvoices"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
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
              <Label>Metode Pembayaran</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
                <div className="grid gap-2">
                    <Label>Total Tagihan</Label>
                    <p className="font-semibold text-lg">Rp{billToPay.toLocaleString('id-ID')}</p>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="discount">Diskon (Rp)</Label>
                    <Controller
                        name="discount"
                        control={control}
                        render={({ field }) => (
                            <Input
                            {...field}
                            id="discount"
                            type="number"
                            placeholder="0"
                            onChange={e => field.onChange(e.target.value)}
                            />
                        )}
                    />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="paidAmount">Jumlah Dibayar (Rp)</Label>
                    <Controller
                        name="paidAmount"
                        control={control}
                        render={({ field }) => (
                            <Input
                            {...field}
                            id="paidAmount"
                            type="number"
                            placeholder="0"
                            onChange={e => field.onChange(e.target.value)}
                            />
                        )}
                    />
                </div>
                 <div className="grid gap-2">
                    <Label>{paymentDifference < 0 ? 'Kekurangan' : 'Kembalian'}</Label>
                     <p className={cn("font-semibold text-lg", paymentDifference < 0 && "text-destructive")}>
                        Rp{Math.abs(paymentDifference).toLocaleString('id-ID')}
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
          <DialogFooter>
            <Button type="submit">Konfirmasi Pembayaran</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
